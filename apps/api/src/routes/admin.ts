import { Elysia, t } from "elysia";
import {
  db,
  users,
  disciplines,
  tournaments,
  tournamentParticipants,
  matches,
  eloHistory,
} from "@beefurca/database";
import { eq, and, sql, count } from "drizzle-orm";
import { authPlugin, checkRole, revokeAllUserTokens } from "../middleware/auth";
import {
  generateDisciplinePopularityReport,
  generatePlayerReport,
} from "@beefurca/excel-generator";

export const adminRoutes = new Elysia({ prefix: "/admin" })
  .use(authPlugin)
  // добавление официальной дисциплины (только администратор)
  .post(
    "/disciplines",
    async ({ user, body, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      checkRole(user, ["Admin"], set);

      const [existing] = await db
        .select()
        .from(disciplines)
        .where(eq(disciplines.name, body.name))
        .limit(1);

      if (existing) {
        set.status = 400;
        return { error: "Discipline name is already registered" };
      }

      const [newDiscipline] = await db
        .insert(disciplines)
        .values({
          name: body.name,
          gameType: body.gameType as any,
          rules: body.rules,
          isActive: true,
          isOfficial: true, // официальная, курируемая администратором
          createdBy: user.id,
        })
        .returning();

      return {
        message: "Official discipline registered successfully",
        discipline: newDiscipline,
      };
    },
    {
      body: t.Object({
        name: t.String(),
        gameType: t.String(),
        rules: t.Optional(t.String()),
      }),
    }
  )
  // редактирование названия и правил дисциплины (только администратор)
  .put(
    "/disciplines/:id",
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      checkRole(user, ["Admin"], set);

      const updateData: { name?: string; rules?: string | null } = {};
      if (body.name !== undefined) {
        // проверяем уникальность только при смене имени
        const [existing] = await db
          .select({ id: disciplines.id })
          .from(disciplines)
          .where(eq(disciplines.name, body.name))
          .limit(1);
        if (existing && existing.id !== params.id) {
          set.status = 400;
          return { error: "Discipline name is already taken" };
        }
        updateData.name = body.name;
      }
      if (body.rules !== undefined) updateData.rules = body.rules || null;

      if (Object.keys(updateData).length === 0) {
        set.status = 400;
        return { error: "Nothing to update" };
      }

      const [updated] = await db
        .update(disciplines)
        .set(updateData)
        .where(eq(disciplines.id, params.id))
        .returning();

      if (!updated) {
        set.status = 404;
        return { error: "Discipline not found" };
      }

      return { message: "Discipline updated", discipline: updated };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String()),
        rules: t.Optional(t.String()),
      }),
    }
  )
  // удаление дисциплины (только администратор); запрещено, если на неё ссылаются турниры
  .delete(
    "/disciplines/:id",
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      checkRole(user, ["Admin"], set);

      const [{ value: tourCount }] = await db
        .select({ value: count() })
        .from(tournaments)
        .where(eq(tournaments.disciplineId, params.id));

      if (tourCount > 0) {
        set.status = 409;
        return {
          error: `Нельзя удалить: дисциплина используется в ${tourCount} турнире(ах). Сначала удалите или перепривяжите турниры.`,
        };
      }

      const [deleted] = await db
        .delete(disciplines)
        .where(eq(disciplines.id, params.id))
        .returning();

      if (!deleted) {
        set.status = 404;
        return { error: "Discipline not found" };
      }

      return { message: `Дисциплина "${deleted.name}" удалена` };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )
  // перевод дисциплины в официальные и обратно (только администратор)
  .put(
    "/disciplines/:id/official",
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      checkRole(user, ["Admin"], set);

      const [updated] = await db
        .update(disciplines)
        .set({ isOfficial: body.isOfficial })
        .where(eq(disciplines.id, params.id))
        .returning();

      if (!updated) {
        set.status = 404;
        return { error: "Discipline not found" };
      }
      return {
        message: `Discipline "${updated.name}" official status: ${body.isOfficial}`,
        discipline: updated,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ isOfficial: t.Boolean() }),
    }
  )
  // блокировка и разблокировка пользователя (только администратор)
  .put(
    "/users/:id/ban",
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      checkRole(user, ["Admin"], set);

      if (user.id === params.id) {
        set.status = 400;
        return { error: "You cannot ban yourself" };
      }

      const [targetUser] = await db
        .update(users)
        .set({ isBanned: body.isBanned })
        .where(eq(users.id, params.id))
        .returning();

      if (!targetUser) {
        set.status = 404;
        return { error: "User not found" };
      }

      // при бане немедленно отзываем все refresh-токены в Redis
      if (body.isBanned) {
        await revokeAllUserTokens(params.id);
        console.log(`User ${params.id} has been banned. Revoked all session tokens.`);
      }

      return {
        message: `User ${targetUser.nickname} has been successfully ${
          body.isBanned ? "banned" : "unbanned"
        }.`,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        isBanned: t.Boolean(),
      }),
    }
  )
  // отчёт о популярности дисциплин в Excel (только администратор)
  .get(
    "/reports/popularity",
    async ({ user, query, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      checkRole(user, ["Admin"], set);

      const start = query.startDate ? new Date(query.startDate) : new Date(0);
      const end = query.endDate ? new Date(query.endDate) : new Date();

      const reportData = await db.execute(sql`
        SELECT
          d.name as "disciplineName",
          COUNT(DISTINCT t.id)::int as "tournamentsCount",
          COUNT(DISTINCT CASE WHEN t.tournament_type = 'STANDARD' THEN t.id END)::int as "officialCount",
          COUNT(DISTINCT CASE WHEN t.tournament_type = 'SANDBOX' THEN t.id END)::int as "autonomousCount",
          COUNT(DISTINCT tp.id)::int as "participantsCount",
          COALESCE(ROUND(COUNT(DISTINCT tp.id)::numeric / NULLIF(COUNT(DISTINCT t.id), 0), 1), 0)::float as "avgParticipants",
          COUNT(DISTINCT m.id)::int as "matchesCount"
        FROM disciplines d
        LEFT JOIN tournaments t ON t.discipline_id = d.id AND t.created_at BETWEEN ${start} AND ${end}
        LEFT JOIN tournament_participants tp ON tp.tournament_id = t.id
        LEFT JOIN matches m ON m.tournament_id = t.id AND m.played_at IS NOT NULL
        GROUP BY d.id, d.name
        ORDER BY "tournamentsCount" DESC
      `);

      const formattedData = reportData.map((row: any) => ({
        disciplineName: row.disciplineName,
        tournamentsCount: row.tournamentsCount,
        officialCount: row.officialCount,
        autonomousCount: row.autonomousCount,
        participantsCount: row.participantsCount,
        avgParticipants: row.avgParticipants,
        matchesCount: row.matchesCount,
      }));

      const startStr = start.toLocaleDateString("ru-RU");
      const endStr = end.toLocaleDateString("ru-RU");
      const excelBuffer = await generateDisciplinePopularityReport(
        startStr,
        endStr,
        formattedData
      );

      set.headers["content-type"] =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      set.headers["content-disposition"] =
        'attachment; filename="discipline_popularity_report.xlsx"';

      return excelBuffer;
    },
    {
      query: t.Object({
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
      }),
    }
  )
  // отчёт по статистике игрока в Excel (только администратор)
  .get(
    "/reports/player/:id",
    async ({ user, params, query, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      checkRole(user, ["Admin"], set);

      const [player] = await db
        .select()
        .from(users)
        .where(eq(users.id, params.id))
        .limit(1);

      if (!player) {
        set.status = 404;
        return { error: "Player not found" };
      }

      const start = query.startDate ? new Date(query.startDate) : new Date(0);
      const end = query.endDate ? new Date(query.endDate) : new Date();

      // агрегирующий SQL-запрос: число сыгранных матчей и побед
      // Период считается по дате сыгранного матча (m.played_at), а не по дате
      // регистрации участника. SANDBOX-турниры в отчёт не включаются (kursovik).
      const stats = await db.execute(sql`
        SELECT
          d.name as "disciplineName",
          COUNT(DISTINCT m.id)::int as "matchesCount",
          COUNT(DISTINCT CASE WHEN m.winner_id = tp.id THEN m.id END)::int as "winsCount",
          COALESCE(SUM(eh.new_elo - eh.old_elo), 0)::int as "eloDelta",
          ${player.elo}::int as "currentElo"
        FROM tournament_participants tp
        INNER JOIN tournaments t ON tp.tournament_id = t.id
        INNER JOIN disciplines d ON t.discipline_id = d.id
        INNER JOIN matches m ON m.tournament_id = t.id AND m.played_at IS NOT NULL AND m.played_at BETWEEN ${start} AND ${end} AND (m.participant1_id = tp.id OR m.participant2_id = tp.id)
        LEFT JOIN elo_history eh ON eh.match_id = m.id AND eh.user_id = ${player.id}
        WHERE tp.user_id = ${player.id} AND t.tournament_type <> 'SANDBOX'
        GROUP BY d.id, d.name
      `);

      const formattedData = stats.map((row: any) => ({
        disciplineName: row.disciplineName,
        matchesCount: row.matchesCount,
        winsCount: row.winsCount,
        eloDelta: row.eloDelta,
        currentElo: row.currentElo,
      }));

      const startStr = start.toLocaleDateString("ru-RU");
      const endStr = end.toLocaleDateString("ru-RU");
      const excelBuffer = await generatePlayerReport(
        player.nickname,
        startStr,
        endStr,
        formattedData
      );

      set.headers["content-type"] =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      set.headers["content-disposition"] = `attachment; filename="player_${player.nickname}_report.xlsx"`;

      return excelBuffer;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/users",
    async ({ user, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      checkRole(user, ["Admin"], set);

      const allUsers = await db
        .select({
          id: users.id,
          nickname: users.nickname,
          email: users.email,
          role: users.role,
          elo: users.elo,
          isBanned: users.isBanned,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.isDeleted, false))
        .orderBy(users.nickname);

      return allUsers;
    }
  )
  // Мягкое удаление пользователя администратором (обезличивание + отзыв сессий)
  .delete(
    "/users/:id",
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      checkRole(user, ["Admin"], set);

      if (user.id === params.id) {
        set.status = 400;
        return { error: "Use DELETE /users/me to delete your own account" };
      }

      const [target] = await db
        .update(users)
        .set({
          isDeleted: true,
          fullName: null,
          phone: null,
          email: `deleted_${params.id}@deleted.beefurca.local`,
          nickname: `deleted_${params.id.slice(0, 8)}`,
          passwordHash: null,
        })
        .where(eq(users.id, params.id))
        .returning();

      if (!target) {
        set.status = 404;
        return { error: "User not found" };
      }

      await revokeAllUserTokens(params.id);

      return { message: "User soft-deleted. Match history preserved." };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .put(
    "/users/:id/role",
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      checkRole(user, ["Admin"], set);

      const [updated] = await db
        .update(users)
        .set({ role: body.role as any })
        .where(eq(users.id, params.id))
        .returning();

      if (!updated) {
        set.status = 404;
        return { error: "User not found" };
      }

      return { message: `User role updated to ${body.role} successfully.` };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        role: t.String(),
      }),
    }
  );
