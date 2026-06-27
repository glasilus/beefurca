import { Elysia, t } from "elysia";
import { db, users, teams, teamMembers, eloHistory, tournamentParticipants, tournaments, disciplines, matches } from "@beefurca/database";
import { eq, and, ne, sql } from "drizzle-orm";
import { authPlugin, revokeAllUserTokens } from "../middleware/auth";
import bcrypt from "bcryptjs";
import { redis } from "../utils/redis";

export const userRoutes = new Elysia({ prefix: "/users" })
  .use(authPlugin)
  .get("/me", async ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const [profile] = await db
      .select({
        id: users.id,
        nickname: users.nickname,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        role: users.role,
        elo: users.elo,
        isTrusted: users.isTrusted,
        discordLinked: sql<boolean>`(${users.discordId} IS NOT NULL)`,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    // Get user's teams where they are a member or captain
    const userTeams = await db
      .select({
        teamId: teams.id,
        teamName: teams.name,
        captainId: teams.captainId,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(and(eq(teamMembers.playerId, user.id), eq(teams.isDisbanded, false)));

    return { profile, teams: userTeams };
  })
  .put(
    "/me",
    async ({ user, body, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const updates: any = {};
      if (body.nickname) {
        // Check if nickname is taken by someone else
        const [existing] = await db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.nickname, body.nickname), ne(users.id, user.id)))
          .limit(1);
        if (existing) {
          set.status = 400;
          return { error: "Nickname is already taken" };
        }
        updates.nickname = body.nickname;
      }
      
      if (body.email) {
        const [existing] = await db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.email, body.email), ne(users.id, user.id)))
          .limit(1);
        if (existing) {
          set.status = 400;
          return { error: "Email is already taken" };
        }
        updates.email = body.email;
      }

      if (body.password) {
        updates.passwordHash = await bcrypt.hash(body.password, 12);
      }

      if (body.fullName !== undefined) {
        updates.fullName = body.fullName || null;
      }

      if (body.phone !== undefined) {
        updates.phone = body.phone || null;
      }

      if (Object.keys(updates).length === 0) {
        return { message: "No updates provided" };
      }

      await db.update(users).set(updates).where(eq(users.id, user.id));
      return { message: "Profile updated successfully" };
    },
    {
      body: t.Object({
        nickname: t.Optional(t.String()),
        email: t.Optional(t.String()),
        password: t.Optional(t.String()),
        fullName: t.Optional(t.String()),
        phone: t.Optional(t.String()),
      }),
    }
  )
  // Удаление собственного аккаунта (мягкое): личные данные обезличиваются,
  // но статистика матчей сохраняется (требование ТЗ). Все сессии отзываются.
  .delete("/me", async ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    await db
      .update(users)
      .set({
        isDeleted: true,
        // Обезличивание ПДн с сохранением уникальности полей
        fullName: null,
        phone: null,
        email: `deleted_${user.id}@deleted.beefurca.local`,
        nickname: `deleted_${user.id.slice(0, 8)}`,
        passwordHash: null,
        discordId: null,
      })
      .where(eq(users.id, user.id));

    await revokeAllUserTokens(user.id);

    set.headers["set-cookie"] = [
      "access_token=; Path=/; Max-Age=0",
      "refresh_token=; Path=/; Max-Age=0",
    ];

    return { message: "Account deleted. Your match history is preserved anonymously." };
  })
  .post(
    "/teams",
    async ({ user, body, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      // Check if team name already exists
      const [existing] = await db
        .select({ id: teams.id })
        .from(teams)
        .where(eq(teams.name, body.name))
        .limit(1);

      if (existing) {
        set.status = 400;
        return { error: "Team name is already taken" };
      }

      // Create team and add captain as the first member in a transaction
      const newTeam = await db.transaction(async (tx) => {
        const [insertedTeam] = await tx
          .insert(teams)
          .values({
            name: body.name,
            captainId: user.id,
          })
          .returning();

        await tx.insert(teamMembers).values({
          teamId: insertedTeam.id,
          playerId: user.id,
        });

        return insertedTeam;
      });

      return { message: "Team created successfully", team: newTeam };
    },
    {
      body: t.Object({
        name: t.String(),
      }),
    }
  )
  .post(
    "/teams/:id/members",
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      // Verify team exists and requester is the captain
      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, params.id))
        .limit(1);

      if (!team) {
        set.status = 404;
        return { error: "Team not found" };
      }

      if (team.captainId !== user.id) {
        set.status = 403;
        return { error: "Forbidden: Only the captain can manage members" };
      }

      // Find user to add by nickname
      const [playerToAdd] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.nickname, body.nickname), eq(users.isDeleted, false)))
        .limit(1);

      if (!playerToAdd) {
        set.status = 404;
        return { error: "User not found" };
      }

      // Check if already in the team
      const [existingMember] = await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, team.id),
            eq(teamMembers.playerId, playerToAdd.id)
          )
        )
        .limit(1);

      if (existingMember) {
        set.status = 400;
        return { error: "User is already a member of this team" };
      }

      await db.insert(teamMembers).values({
        teamId: team.id,
        playerId: playerToAdd.id,
      });

      return { message: "Member added successfully" };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        nickname: t.String(),
      }),
    }
  )
  .delete(
    "/teams/:id/members/:playerId",
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, params.id))
        .limit(1);

      if (!team) {
        set.status = 404;
        return { error: "Team not found" };
      }

      // Only captain can kick, except if a player wants to leave themselves
      if (team.captainId !== user.id && params.playerId !== user.id) {
        set.status = 403;
        return { error: "Forbidden: Only the captain can remove other members" };
      }

      if (team.captainId === params.playerId && team.captainId === user.id) {
        set.status = 400;
        return { error: "Captain cannot leave the team. You must disband it or transfer captaincy." };
      }

      const result = await db
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, team.id),
            eq(teamMembers.playerId, params.playerId)
          )
        )
        .returning();

      if (result.length === 0) {
        set.status = 404;
        return { error: "Member not found in team" };
      }

      return { message: "Member removed successfully" };
    },
    {
      params: t.Object({
        id: t.String(),
        playerId: t.String(),
      }),
    }
  )
  // Вступление в команду по ссылке-приглашению (UUID команды = код).
  // Согласие игрока выражено самим переходом по ссылке и нажатием «Вступить».
  .post(
    "/teams/:id/join",
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, params.id))
        .limit(1);

      if (!team || team.isDisbanded) {
        set.status = 404;
        return { error: "Team not found" };
      }

      const [existingMember] = await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.playerId, user.id)))
        .limit(1);

      if (existingMember) {
        return { message: "You are already a member of this team", team };
      }

      await db.insert(teamMembers).values({ teamId: team.id, playerId: user.id });
      return { message: `You joined team ${team.name}`, team };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )
  // Роспуск команды (только капитан) — софт-делит: строка сохраняется ради
  // целостности истории турниров, но команда скрывается из активных списков,
  // её состав очищается, а имя освобождается для повторного использования.
  .delete(
    "/teams/:id",
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, params.id))
        .limit(1);

      if (!team) {
        set.status = 404;
        return { error: "Team not found" };
      }

      if (team.captainId !== user.id) {
        set.status = 403;
        return { error: "Forbidden: Only the captain can disband the team" };
      }

      await db.transaction(async (tx) => {
        await tx
          .update(teams)
          .set({
            isDisbanded: true,
            // освобождаем уникальное имя
            name: `${team.name}_disbanded_${team.id.slice(0, 8)}`,
          })
          .where(eq(teams.id, team.id));
        // Очищаем состав (история турниров хранит снапшоты имён отдельно)
        await tx.delete(teamMembers).where(eq(teamMembers.teamId, team.id));
      });

      return { message: "Team disbanded" };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )
  .get("/teams", async () => {
    return db.select().from(teams).where(eq(teams.isDisbanded, false));
  })
  // Состав конкретной команды (для управления ростером)
  .get(
    "/teams/:id/members",
    async ({ params }) => {
      return db
        .select({
          playerId: teamMembers.playerId,
          nickname: users.nickname,
          joinedAt: teamMembers.joinedAt,
        })
        .from(teamMembers)
        .innerJoin(users, eq(teamMembers.playerId, users.id))
        .where(eq(teamMembers.teamId, params.id));
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )
  // 7. Get user's tournament history (where they are a registered participant)
  .get("/me/tournaments", async ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const history = await db
      .select({
        participantId: tournamentParticipants.id,
        status: tournamentParticipants.status,
        joinedAt: tournamentParticipants.joinedAt,
        tournamentId: tournaments.id,
        tournamentName: tournaments.name,
        tournamentType: tournaments.tournamentType,
        bracketType: tournaments.bracketType,
        isStarted: tournaments.isStarted,
        isCompleted: tournaments.isCompleted,
        disciplineName: disciplines.name,
      })
      .from(tournamentParticipants)
      .innerJoin(tournaments, eq(tournamentParticipants.tournamentId, tournaments.id))
      .innerJoin(disciplines, eq(tournaments.disciplineId, disciplines.id))
      .where(eq(tournamentParticipants.userId, user.id));

    return history;
  })
  // 8. Get player's ELO history for drawing charts
  .get(
    "/:id/elo-history",
    async ({ params, set }) => {
      const [usr] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, params.id))
        .limit(1);

      if (!usr) {
        set.status = 404;
        return { error: "User not found" };
      }

      const log = await db
        .select({
          id: eloHistory.id,
          oldElo: eloHistory.oldElo,
          newElo: eloHistory.newElo,
          recordedAt: eloHistory.recordedAt,
          tournamentName: tournaments.name,
          matchId: eloHistory.matchId,
        })
        .from(eloHistory)
        .innerJoin(tournaments, eq(eloHistory.tournamentId, tournaments.id))
        .where(eq(eloHistory.userId, params.id))
        .orderBy(eloHistory.recordedAt);

      return log;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .get("/referees", async () => {
    return db
      .select({
        id: users.id,
        nickname: users.nickname,
        role: users.role,
      })
      .from(users)
      .where(and(eq(users.isDeleted, false), eq(users.isBanned, false)));
  })
  .get(
    "/:id/discipline-stats",
    async ({ params, set }) => {
      const [usr] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, params.id))
        .limit(1);

      if (!usr) {
        set.status = 404;
        return { error: "User not found" };
      }

      const stats = await db.execute(sql`
        SELECT 
          d.id as "disciplineId",
          d.name as "disciplineName",
          COUNT(DISTINCT m.id)::int as "matchesCount",
          COUNT(DISTINCT CASE WHEN m.winner_id = tp.id THEN m.id END)::int as "winsCount",
          COALESCE(SUM(eh.new_elo - eh.old_elo), 0)::int as "eloDelta"
        FROM tournament_participants tp
        INNER JOIN tournaments t ON tp.tournament_id = t.id
        INNER JOIN disciplines d ON t.discipline_id = d.id
        INNER JOIN matches m ON m.tournament_id = t.id AND m.played_at IS NOT NULL AND (m.participant1_id = tp.id OR m.participant2_id = tp.id)
        LEFT JOIN elo_history eh ON eh.match_id = m.id AND eh.user_id = ${params.id}
        WHERE tp.user_id = ${params.id}
        GROUP BY d.id, d.name
      `);

      return stats;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .get(
    "/disciplines/:disciplineId/leaderboard",
    async ({ params, query, set }) => {
      const page = query.page ? Number(query.page) || 1 : 1;
      const pageSize = 50;
      const cacheKey = `leaderboard:${params.disciplineId}:${page}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const leaderboard = await db
        .select({
          id: users.id,
          nickname: users.nickname,
          elo: users.elo,
        })
        .from(users)
        .where(
          and(
            eq(users.isDeleted, false),
            eq(users.isBanned, false),
            sql`users.id IN (
              SELECT DISTINCT user_id 
              FROM tournament_participants tp
              INNER JOIN tournaments t ON tp.tournament_id = t.id
              WHERE t.discipline_id = ${params.disciplineId}::uuid AND tp.user_id IS NOT NULL
            )`
          )
        )
        .orderBy(sql`users.elo DESC`)
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      await redis.setex(cacheKey, 300, JSON.stringify(leaderboard));
      return leaderboard;
    },
    {
      params: t.Object({
        disciplineId: t.String(),
      }),
      query: t.Object({
        page: t.Optional(t.String()),
      }),
    }
  )
  // Public player profile — no auth required
  .get(
    "/:id/public",
    async ({ params, set }) => {
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_RE.test(params.id)) {
        set.status = 404;
        return { error: "Player not found" };
      }

      try {
        const [usr] = await db
          .select({
            id: users.id,
            nickname: users.nickname,
            role: users.role,
            createdAt: users.createdAt,
            isDeleted: users.isDeleted,
            isBanned: users.isBanned,
          })
          .from(users)
          .where(eq(users.id, params.id))
          .limit(1);

        if (!usr || usr.isDeleted || usr.isBanned) {
          set.status = 404;
          return { error: "Player not found" };
        }

        return {
          id: usr.id,
          nickname: usr.nickname,
          role: usr.role,
          createdAt: usr.createdAt,
        };
      } catch {
        set.status = 404;
        return { error: "Player not found" };
      }
    },
    {
      params: t.Object({ id: t.String() }),
    }
  );

