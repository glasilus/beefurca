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
import { eq, and, sql } from "drizzle-orm";
import { authPlugin, checkRole, revokeAllUserTokens } from "../middleware/auth";
import {
  generateDisciplinePopularityReport,
  generatePlayerReport,
} from "@beefurca/excel-generator";

export const adminRoutes = new Elysia({ prefix: "/admin" })
  .use(authPlugin)
  // 1. Add Official Discipline (Admin only)
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
  // 1b. Promote/demote discipline to official (Admin only)
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
  // 2. Ban/Unban User (Admin only)
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

      // If banned, instantly revoke all active refresh tokens in Redis
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
  // 3. Toggle Trusted Organizer status (Admin only)
  .put(
    "/users/:id/trust",
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      checkRole(user, ["Admin"], set);

      const [targetUser] = await db
        .update(users)
        .set({ isTrusted: body.isTrusted })
        .where(eq(users.id, params.id))
        .returning();

      if (!targetUser) {
        set.status = 404;
        return { error: "User not found" };
      }

      return {
        message: `Organizer ${targetUser.nickname} trust status updated to ${body.isTrusted}.`,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        isTrusted: t.Boolean(),
      }),
    }
  )
  // 4. Generate Discipline Popularity Report (Excel Export, Admin only)
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

      // Aggregate data using SQL queries
      const reportData = await db.execute(sql`
        SELECT
          d.name as "disciplineName",
          COUNT(DISTINCT t.id)::int as "tournamentsCount",
          COUNT(DISTINCT CASE WHEN t.tournament_type = 'PRO' THEN t.id END)::int as "proCount",
          COUNT(DISTINCT CASE WHEN t.tournament_type = 'AMATEUR' THEN t.id END)::int as "amateurCount",
          COUNT(DISTINCT CASE WHEN t.tournament_type = 'SANDBOX' THEN t.id END)::int as "sandboxCount",
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
        proCount: row.proCount,
        amateurCount: row.amateurCount,
        sandboxCount: row.sandboxCount,
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
  // 5. Generate Player statistics report (Excel Export, Admin only)
  .get(
    "/reports/player/:id",
    async ({ user, params, query, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      checkRole(user, ["Admin"], set);

      // Verify user exists
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

      // Query database for ELO stats and wins/matches per discipline
      // We will perform SQL aggregate query for matches played and wins:
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
          isTrusted: users.isTrusted,
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
          discordId: null,
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
