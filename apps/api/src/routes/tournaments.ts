import { Elysia, t } from "elysia";
import {
  db,
  tournaments,
  tournamentParticipants,
  matches,
  disciplines,
  users,
  teams,
} from "@beefurca/database";
import { eq, and, or, sql, isNull, desc, asc } from "drizzle-orm";
import { authPlugin, checkRole } from "../middleware/auth";
import { sseManager, SSEClient, publishTournamentUpdate } from "../utils/sse";
import {
  generateSingleElimination,
  generateDoubleElimination,
  generateRoundRobin,
  generateSwissRound1,
  generateNextSwissRound,
  calculateBuchholz,
} from "@beefurca/bracket-engine";
import Workbook from "exceljs";

export const tournamentRoutes = new Elysia({ prefix: "/tournaments" })
  .use(authPlugin)
  .get("/disciplines", async () => {
    // Официальные дисциплины — выше, затем по алфавиту.
    return db
      .select()
      .from(disciplines)
      .where(eq(disciplines.isActive, true))
      .orderBy(desc(disciplines.isOfficial), asc(disciplines.name));
  })
  // Создание ПОЛЬЗОВАТЕЛЬСКОЙ дисциплины любым залогиненным пользователем.
  // Ядро платформы: каждый может завести соревнование по чему угодно, не дожидаясь
  // администратора. Такие дисциплины помечаются isOfficial=false. Официальные
  // (курируемые) дисциплины создаёт администратор через POST /admin/disciplines.
  .post(
    "/disciplines",
    async ({ user, body, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      if (body.gameType !== "SINGLE" && body.gameType !== "TEAM") {
        set.status = 400;
        return { error: "gameType must be SINGLE or TEAM" };
      }

      // Если дисциплина с таким именем уже есть — переиспользуем её,
      // чтобы не плодить дубликаты и не спотыкаться об unique-индекс.
      const [existing] = await db
        .select()
        .from(disciplines)
        .where(eq(disciplines.name, body.name))
        .limit(1);
      if (existing) {
        return { message: "Discipline already exists", discipline: existing };
      }

      const [newDiscipline] = await db
        .insert(disciplines)
        .values({
          name: body.name,
          gameType: body.gameType as any,
          rules: body.rules || null,
          isActive: true,
          isOfficial: false,
          createdBy: user.id,
        })
        .returning();

      return {
        message: "Custom discipline created",
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
  // 1. Create Tournament (PRO: Organizer/Admin; AMATEUR/SANDBOX: любой пользователь)
  .post(
    "/",
    async ({ user, body, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      // Разграничение по типу турнира (мастер-файл / kursovik):
      //  - PRO создают только Организаторы и Администраторы;
      //  - AMATEUR и SANDBOX вправе создать любой зарегистрированный пользователь.
      if (body.tournamentType === "PRO") {
        checkRole(user, ["Organizer", "Admin"], set);
      } else if (
        body.tournamentType !== "AMATEUR" &&
        body.tournamentType !== "SANDBOX"
      ) {
        set.status = 400;
        return { error: "Invalid tournament type" };
      }

      // Check if discipline exists
      const [discipline] = await db
        .select()
        .from(disciplines)
        .where(eq(disciplines.id, body.disciplineId))
        .limit(1);

      if (!discipline) {
        set.status = 400;
        return { error: "Selected discipline does not exist" };
      }

      const [newTournament] = await db
        .insert(tournaments)
        .values({
          name: body.name,
          description: body.description?.trim() || null,
          disciplineId: body.disciplineId,
          organizerId: user.id,
          tournamentType: body.tournamentType as any,
          bracketType: body.bracketType as any,
          prizePool: body.prizePool,
          entryFee: body.entryFee,
          customFieldsSchema: body.customFieldsSchema || null,
          startDate: new Date(body.startDate),
          endDate: body.endDate ? new Date(body.endDate) : null,
          isPrivate: body.isPrivate ?? false,
          isStarted: false,
          isCompleted: false,
        })
        .returning();

      return {
        message: "Tournament created successfully",
        tournament: newTournament,
      };
    },
    {
      body: t.Object({
        name: t.String(),
        disciplineId: t.String(),
        tournamentType: t.String(),
        bracketType: t.String(),
        prizePool: t.Optional(t.String()),
        entryFee: t.Optional(t.Numeric()),
        customFieldsSchema: t.Optional(t.Any()),
        startDate: t.String(),
        endDate: t.Optional(t.String()),
        isPrivate: t.Optional(t.Boolean()),
        description: t.Optional(t.String()),
      }),
    }
  )
  // 2. List Tournaments (All roles)
  .get("/", async ({ user }) => {
    // Публичный каталог: приватные турниры скрыты. Организатор видит свои
    // приватные, админ — все.
    const visibility =
      user && user.role === "Admin"
        ? undefined
        : user
        ? or(eq(tournaments.isPrivate, false), eq(tournaments.organizerId, user.id))
        : eq(tournaments.isPrivate, false);

    return db
      .select({
        id: tournaments.id,
        name: tournaments.name,
        tournamentType: tournaments.tournamentType,
        bracketType: tournaments.bracketType,
        prizePool: tournaments.prizePool,
        startDate: tournaments.startDate,
        isStarted: tournaments.isStarted,
        isCompleted: tournaments.isCompleted,
        isPrivate: tournaments.isPrivate,
        disciplineName: disciplines.name,
        organizerId: tournaments.organizerId,
      })
      .from(tournaments)
      .innerJoin(disciplines, eq(tournaments.disciplineId, disciplines.id))
      .where(visibility);
  })
  // 3. Get Tournament Details (Includes participants and matches)
  .get(
    "/:id",
    async ({ params, set, user }) => {
      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, params.id))
        .limit(1);

      if (!tournament) {
        set.status = 404;
        return { error: "Tournament not found" };
      }

      // Приватный турнир доступен только организатору, администратору и участникам.
      if (tournament.isPrivate) {
        if (!user) {
          set.status = 403;
          return { error: "Приватный турнир. Войдите в систему для доступа." };
        }
        const isOrganizer = tournament.organizerId === user.id;
        const isAdmin = user.role === "Admin";
        if (!isOrganizer && !isAdmin) {
          const [participation] = await db
            .select({ id: tournamentParticipants.id })
            .from(tournamentParticipants)
            .where(
              and(
                eq(tournamentParticipants.tournamentId, tournament.id),
                eq(tournamentParticipants.userId, user.id)
              )
            )
            .limit(1);
          if (!participation) {
            set.status = 403;
            return { error: "Доступ запрещён: приватный турнир." };
          }
        }
      }

      const participants = await db
        .select()
        .from(tournamentParticipants)
        .where(eq(tournamentParticipants.tournamentId, params.id));

      const tournamentMatches = await db
        .select()
        .from(matches)
        .where(eq(matches.tournamentId, params.id));

      return { tournament, participants, matches: tournamentMatches };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  // 3b. Edit Tournament (Organizer / Admin only)
  .put(
    "/:id",
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, params.id))
        .limit(1);

      if (!tournament) {
        set.status = 404;
        return { error: "Tournament not found" };
      }

      if (tournament.organizerId !== user.id && user.role !== "Admin") {
        set.status = 403;
        return { error: "Только организатор может редактировать турнир." };
      }

      const updateData: Record<string, any> = {};
      if (body.name !== undefined) updateData.name = body.name.trim();
      if (body.description !== undefined) updateData.description = body.description?.trim() || null;
      if (body.prizePool !== undefined) updateData.prizePool = body.prizePool?.trim() || null;
      if (body.isPrivate !== undefined) updateData.isPrivate = body.isPrivate;

      // Даты и взнос можно менять только до старта
      if (!tournament.isStarted) {
        if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
        if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
        if (body.entryFee !== undefined) updateData.entryFee = body.entryFee;
      }

      const [updated] = await db
        .update(tournaments)
        .set(updateData)
        .where(eq(tournaments.id, params.id))
        .returning();

      return { message: "Турнир обновлён", tournament: updated };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        prizePool: t.Optional(t.String()),
        isPrivate: t.Optional(t.Boolean()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        entryFee: t.Optional(t.Numeric()),
      }),
    }
  )
  // 4. Join Tournament (Players only, Sandbox does not use registration)
  .post(
    "/:id/join",
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, params.id))
        .limit(1);

      if (!tournament) {
        set.status = 404;
        return { error: "Tournament not found" };
      }

      if (tournament.isStarted) {
        set.status = 400;
        return { error: "Cannot join. Tournament has already started." };
      }

      if (tournament.tournamentType === "SANDBOX") {
        set.status = 400;
        return { error: "Sandbox tournaments do not accept registrations." };
      }

      // Check if already registered
      const [existing] = await db
        .select()
        .from(tournamentParticipants)
        .where(
          and(
            eq(tournamentParticipants.tournamentId, tournament.id),
            eq(tournamentParticipants.userId, user.id)
          )
        )
        .limit(1);

      if (existing) {
        set.status = 400;
        return { error: "You are already registered for this tournament." };
      }

      // Get discipline to check Single vs Team format
      const [disc] = await db
        .select()
        .from(disciplines)
        .where(eq(disciplines.id, tournament.disciplineId))
        .limit(1);

      const isTeamDiscipline = disc?.gameType === "TEAM";

      if (isTeamDiscipline && !body.teamId) {
        set.status = 400;
        return { error: "This is a team tournament. Please supply a teamId." };
      }

      let teamSnapshot: string | null = null;
      if (body.teamId) {
        const [team] = await db
          .select()
          .from(teams)
          .where(eq(teams.id, body.teamId))
          .limit(1);
        if (!team) {
          set.status = 404;
          return { error: "Team not found" };
        }
        teamSnapshot = team.name;
      }

      const [newParticipant] = await db
        .insert(tournamentParticipants)
        .values({
          tournamentId: tournament.id,
          userId: user.id,
          teamId: body.teamId || null,
          nicknameSnapshot: user.nickname,
          teamSnapshot,
          status: tournament.tournamentType === "AMATEUR" ? "APPROVED" : "PENDING", // Amateur is auto-approved
        })
        .returning();

      return {
        message: "Successfully submitted tournament registration",
        participant: newParticipant,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        teamId: t.Optional(t.String()),
      }),
    }
  )
  // 4b. Manually add a participant by name (SANDBOX only).
  // Ключевой сценарий «песочницы»: организатор вписывает имена строками вручную,
  // без привязки к зарегистрированным аккаунтам.
  .post(
    "/:id/participants",
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, params.id))
        .limit(1);

      if (!tournament) {
        set.status = 404;
        return { error: "Tournament not found" };
      }

      if (tournament.organizerId !== user.id && user.role !== "Admin") {
        set.status = 403;
        return { error: "Forbidden" };
      }

      if (tournament.tournamentType !== "SANDBOX") {
        set.status = 400;
        return {
          error:
            "Manual participant entry is only allowed for SANDBOX tournaments. Use /join for PRO/AMATEUR.",
        };
      }

      if (tournament.isStarted) {
        set.status = 400;
        return { error: "Cannot add participants. Tournament has already started." };
      }

      const nickname = body.nickname.trim();
      if (!nickname) {
        set.status = 400;
        return { error: "Participant name cannot be empty" };
      }

      const [newParticipant] = await db
        .insert(tournamentParticipants)
        .values({
          tournamentId: tournament.id,
          userId: null,
          teamId: null,
          nicknameSnapshot: nickname,
          teamSnapshot: body.teamName?.trim() || null,
          status: "APPROVED", // в песочнице подтверждение не требуется
        })
        .returning();

      return {
        message: "Participant added successfully",
        participant: newParticipant,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        nickname: t.String(),
        teamName: t.Optional(t.String()),
      }),
    }
  )
  // 5. Approve Participant (Organizer only)
  .post(
    "/:id/approve/:participantId",
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, params.id))
        .limit(1);

      if (!tournament) {
        set.status = 404;
        return { error: "Tournament not found" };
      }

      if (tournament.organizerId !== user.id && user.role !== "Admin") {
        set.status = 403;
        return { error: "Forbidden" };
      }

      const result = await db
        .update(tournamentParticipants)
        .set({ status: "APPROVED" })
        .where(
          and(
            eq(tournamentParticipants.id, params.participantId),
            eq(tournamentParticipants.tournamentId, tournament.id)
          )
        )
        .returning();

      if (result.length === 0) {
        set.status = 404;
        return { error: "Participant not found" };
      }

      return { message: "Participant approved successfully" };
    },
    {
      params: t.Object({
        id: t.String(),
        participantId: t.String(),
      }),
    }
  )
  // 5b. Reject participant application (Organizer/Admin only)
  .post(
    "/:id/reject/:participantId",
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, params.id))
        .limit(1);

      if (!tournament) {
        set.status = 404;
        return { error: "Tournament not found" };
      }

      if (tournament.organizerId !== user.id && user.role !== "Admin") {
        set.status = 403;
        return { error: "Forbidden" };
      }

      if (tournament.isStarted) {
        set.status = 400;
        return { error: "Cannot reject participants after the tournament has started." };
      }

      const result = await db
        .update(tournamentParticipants)
        .set({ status: "REJECTED" })
        .where(
          and(
            eq(tournamentParticipants.id, params.participantId),
            eq(tournamentParticipants.tournamentId, tournament.id)
          )
        )
        .returning();

      if (result.length === 0) {
        set.status = 404;
        return { error: "Participant not found" };
      }

      return { message: "Participant rejected" };
    },
    {
      params: t.Object({
        id: t.String(),
        participantId: t.String(),
      }),
    }
  )
  // 6. Generate Bracket / Start Tournament (Organizer only)
  .post(
    "/:id/generate-bracket",
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, params.id))
        .limit(1);

      if (!tournament) {
        set.status = 404;
        return { error: "Tournament not found" };
      }

      if (tournament.organizerId !== user.id && user.role !== "Admin") {
        set.status = 403;
        return { error: "Forbidden" };
      }

      if (tournament.isStarted) {
        set.status = 400;
        return { error: "Tournament has already started!" };
      }

      // Fetch approved participants
      const approved = await db
        .select()
        .from(tournamentParticipants)
        .where(
          and(
            eq(tournamentParticipants.tournamentId, tournament.id),
            eq(tournamentParticipants.status, "APPROVED")
          )
        );

      if (approved.length < 2) {
        set.status = 400;
        return { error: "Need at least 2 approved participants to start." };
      }

      if (tournament.bracketType === "DOUBLE_ELIM" && approved.length < 3) {
        set.status = 400;
        return { error: "Double Elimination requires at least 3 participants." };
      }

      const enginePlayers = approved.map((ap) => ({
        id: ap.id,
        name: ap.teamSnapshot || ap.nicknameSnapshot,
      }));

      let generatedMatches: any[] = [];
      const bType = tournament.bracketType;

      if (bType === "SINGLE_ELIM") {
        generatedMatches = generateSingleElimination(enginePlayers);
      } else if (bType === "DOUBLE_ELIM") {
        generatedMatches = generateDoubleElimination(enginePlayers);
      } else if (bType === "ROUND_ROBIN") {
        generatedMatches = generateRoundRobin(enginePlayers);
      } else if (bType === "SWISS") {
        generatedMatches = generateSwissRound1(enginePlayers);
        // bye-матч (нет соперника) сразу засчитывается как победа без игры
        for (const m of generatedMatches) {
          if (m.participant1Id && !m.participant2Id) {
            m.winnerParticipantId = m.participant1Id;
          }
        }
      }

      if (generatedMatches.length === 0) {
        set.status = 500;
        return { error: "Failed to generate tournament bracket structure." };
      }

      // Save matches in database (in a transaction to maintain integrity)
      await db.transaction(async (tx) => {
        // Mark tournament as started
        await tx
          .update(tournaments)
          .set({ isStarted: true })
          .where(eq(tournaments.id, tournament.id));

        // Insert matches without IDs first, then retrieve IDs to wire connections.
        // Для матчей, разрешённых движком как BYE (winnerParticipantId), сразу
        // проставляем winnerId и playedAt — игрок проходит без игры, и сетка не
        // зависает при нечётном числе участников.
        const matchPlaceholders = generatedMatches.map((m) => ({
          tournamentId: tournament.id,
          round: m.round,
          position: m.position,
          bracketSection: (m.type as any) || null, // winners/losers/grand_final (double elim)
          participant1Id: m.participant1Id,
          participant2Id: m.participant2Id,
          winnerId: m.winnerParticipantId || null,
          playedAt: m.winnerParticipantId ? new Date() : null,
          refereeId: tournament.organizerId, // Organizer is default referee
        }));

        const insertedMatches = await tx
          .insert(matches)
          .values(matchPlaceholders)
          .returning();

        // Map arrayIndex -> generated database ID
        const indexToIdMap = insertedMatches.map((im) => im.id);

        // Update links: nextMatchId and loserNextMatchId
        for (let i = 0; i < generatedMatches.length; i++) {
          const gen = generatedMatches[i];
          const dbId = indexToIdMap[i];

          const updates: any = {};
          if (gen.nextMatchIndex !== null) {
            updates.nextMatchId = indexToIdMap[gen.nextMatchIndex];
            updates.nextMatchIsP1 = gen.nextMatchIsP1;
          }
          if (gen.loserNextMatchIndex !== undefined && gen.loserNextMatchIndex !== null) {
            updates.loserNextMatchId = indexToIdMap[gen.loserNextMatchIndex];
            updates.loserNextMatchIsP1 = gen.loserNextMatchIsP1;
          }

          if (Object.keys(updates).length > 0) {
            await tx.update(matches).set(updates).where(eq(matches.id, dbId));
          }
        }
      });

      return { message: "Tournament started. Bracket generated successfully." };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  // 6b. Generate next Swiss round (Organizer/Admin).
  // Round Robin генерирует все туры сразу при старте, поэтому эндпоинт — для Swiss.
  .post(
    "/:id/next-round",
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, params.id))
        .limit(1);

      if (!tournament) {
        set.status = 404;
        return { error: "Tournament not found" };
      }

      if (tournament.organizerId !== user.id && user.role !== "Admin") {
        set.status = 403;
        return { error: "Forbidden" };
      }

      if (tournament.bracketType !== "SWISS") {
        set.status = 400;
        return {
          error: "Next-round generation is only applicable to Swiss tournaments.",
        };
      }

      if (!tournament.isStarted) {
        set.status = 400;
        return { error: "Tournament has not started yet." };
      }

      const all = await db
        .select()
        .from(matches)
        .where(eq(matches.tournamentId, tournament.id));

      if (all.length === 0) {
        set.status = 400;
        return { error: "No rounds generated yet. Start the tournament first." };
      }

      const maxRound = Math.max(...all.map((m) => m.round));
      const currentRound = all.filter((m) => m.round === maxRound);

      // Текущий раунд завершён, если у каждого матча есть результат:
      // победитель, либо ничья (playedAt без winner), либо bye (нет соперника).
      const incomplete = currentRound.filter(
        (m) => !m.winnerId && !m.playedAt && !(m.participant1Id && !m.participant2Id)
      );
      if (incomplete.length > 0) {
        set.status = 400;
        return {
          error: `Current round is not complete: ${incomplete.length} match(es) pending.`,
        };
      }

      // Очки и история оппонентов по всем сыгранным матчам
      const participants = await db
        .select()
        .from(tournamentParticipants)
        .where(
          and(
            eq(tournamentParticipants.tournamentId, tournament.id),
            eq(tournamentParticipants.status, "APPROVED")
          )
        );

      const players = participants.map((p) => {
        let points = 0;
        const opponents: string[] = [];
        for (const m of all) {
          const isP1 = m.participant1Id === p.id;
          const isP2 = m.participant2Id === p.id;
          if (!isP1 && !isP2) continue;

          // bye — победа без соперника
          if ((isP1 && !m.participant2Id) || (isP2 && !m.participant1Id)) {
            points += 1;
            opponents.push("bye");
            continue;
          }

          const oppId = isP1 ? m.participant2Id : m.participant1Id;
          if (oppId) opponents.push(oppId);

          if (m.winnerId === p.id) points += 1;
          else if (!m.winnerId && m.playedAt) points += 0.5; // ничья
        }
        return { id: p.id, points, opponents, buchholz: 0 };
      });

      const withBuchholz = calculateBuchholz(players);
      const nextMatches = generateNextSwissRound(withBuchholz, maxRound + 1);

      if (nextMatches.length === 0) {
        set.status = 400;
        return { error: "Could not generate the next round (no valid pairings)." };
      }

      await db.transaction(async (tx) => {
        const placeholders = nextMatches.map((m) => ({
          tournamentId: tournament.id,
          round: m.round,
          position: m.position,
          participant1Id: m.participant1Id,
          participant2Id: m.participant2Id,
          // bye в новом раунде сразу засчитывается победой
          winnerId: m.participant1Id && !m.participant2Id ? m.participant1Id : null,
          playedAt: m.participant1Id && !m.participant2Id ? new Date() : null,
          refereeId: tournament.organizerId,
        }));
        await tx.insert(matches).values(placeholders);
      });

      await publishTournamentUpdate(tournament.id);

      return {
        message: `Swiss round ${maxRound + 1} generated with ${nextMatches.length} matches.`,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  // 7. Bulk Import Participants via Excel (Organizer only)
  .post(
    "/:id/participants/import",
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, params.id))
        .limit(1);

      if (!tournament) {
        set.status = 404;
        return { error: "Tournament not found" };
      }

      if (tournament.organizerId !== user.id && user.role !== "Admin") {
        set.status = 403;
        return { error: "Forbidden" };
      }

      if (tournament.isStarted) {
        set.status = 400;
        return { error: "Cannot import. Tournament has already started." };
      }

      const file = body.file;
      if (!file) {
        set.status = 400;
        return { error: "No file uploaded" };
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = new Workbook.Workbook();
        await workbook.xlsx.load(Buffer.from(arrayBuffer) as any);
        const worksheet = workbook.worksheets[0];

        const importedRows: { nickname: string; teamName?: string }[] = [];

        // Skip headers, read rows. Column 1: Nickname, Column 2: Team Name (optional)
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) {
            const nickname = row.getCell(1).text?.trim();
            const teamName = row.getCell(2).text?.trim() || undefined;
            if (nickname) {
              importedRows.push({ nickname, teamName });
            }
          }
        });

        if (importedRows.length === 0) {
          set.status = 400;
          return { error: "No valid rows found in Excel sheet. Ensure headers match." };
        }

        // For SANDBOX tournaments, we register them as approved participants immediately.
        // For PRO/Amateur, we try to match the Nickname with existing users in DB.
        const isSandbox = tournament.tournamentType === "SANDBOX";

        await db.transaction(async (tx) => {
          for (const row of importedRows) {
            let matchedUserId: string | null = null;
            let matchedTeamId: string | null = null;

            if (!isSandbox) {
              // Find user
              const [dbUser] = await tx
                .select({ id: users.id })
                .from(users)
                .where(and(eq(users.nickname, row.nickname), eq(users.isDeleted, false)))
                .limit(1);

              if (dbUser) {
                matchedUserId = dbUser.id;
              }

              // Find team if provided
              if (row.teamName) {
                const [dbTeam] = await tx
                  .select({ id: teams.id })
                  .from(teams)
                  .where(eq(teams.name, row.teamName))
                  .limit(1);
                if (dbTeam) {
                  matchedTeamId = dbTeam.id;
                }
              }
            }

            // Insert approved participant
            await tx.insert(tournamentParticipants).values({
              tournamentId: tournament.id,
              userId: matchedUserId,
              teamId: matchedTeamId,
              nicknameSnapshot: row.nickname,
              teamSnapshot: row.teamName || null,
              status: "APPROVED", // Imported is automatically approved
            });
          }
        });

        return {
          message: `Successfully imported ${importedRows.length} participants from Excel.`,
        };
      } catch (err: any) {
        set.status = 500;
        return { error: `Failed to parse Excel file: ${err.message}` };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        file: t.File(),
      }),
    }
  )
  // 8. Stream Real-Time Tournament Grid updates (SSE Connection)
  .get("/:id/stream", ({ params, set, request }) => {
    const tournamentId = params.id;
    const clientId = crypto.randomUUID();

    set.headers["content-type"] = "text/event-stream";
    set.headers["cache-control"] = "no-cache";
    set.headers["connection"] = "keep-alive";

    // Set up readable stream for Elysia
    let clientCloseCallback: (() => void) | null = null;

    const stream = new ReadableStream({
      start(controller) {
        const client: SSEClient = {
          id: clientId,
          send(data) {
            controller.enqueue(new TextEncoder().encode(data));
          },
          close() {
            controller.close();
          },
        };

        sseManager.registerClient(tournamentId, client);

        clientCloseCallback = () => {
          sseManager.removeClient(tournamentId, clientId);
        };
      },
      cancel() {
        if (clientCloseCallback) {
          clientCloseCallback();
        }
      },
    });

    return stream;
  })
  // 9. Mass Assign Referee to all matches of a tournament (Organizer only)
  .put(
    "/:id/matches/referee",
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, params.id))
        .limit(1);

      if (!tournament) {
        set.status = 404;
        return { error: "Tournament not found" };
      }

      if (tournament.organizerId !== user.id && user.role !== "Admin") {
        set.status = 403;
        return { error: "Forbidden" };
      }

      if (body.refereeId) {
        const [ref] = await db
          .select()
          .from(users)
          .where(and(eq(users.id, body.refereeId), eq(users.isDeleted, false)))
          .limit(1);
        if (!ref) {
          set.status = 404;
          return { error: "Selected referee user not found or is inactive" };
        }
      }

      // Обновляем рефери ТОЛЬКО у незавершённых матчей (winner_id IS NULL):
      // перепривязка судьи у уже сыгранных матчей исказила бы исторический аудит.
      const updated = await db
        .update(matches)
        .set({ refereeId: body.refereeId || null })
        .where(and(eq(matches.tournamentId, tournament.id), isNull(matches.winnerId)))
        .returning();

      return {
        message: `Successfully updated referee for ${updated.length} pending matches.`,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        refereeId: t.Optional(t.String()),
      }),
    }
  )
  // 10. Get Tournament Standings (All roles)
  .get(
    "/:id/standings",
    async ({ params, set }) => {
      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, params.id))
        .limit(1);

      if (!tournament) {
        set.status = 404;
        return { error: "Tournament not found" };
      }

      // Fetch participants and calculate standings dynamically
      const standings = await db.execute(sql`
        SELECT 
          tp.id as "participantId",
          tp.nickname_snapshot as "nickname",
          tp.team_snapshot as "teamName",
          COUNT(m.id)::int as "matchesPlayed",
          COUNT(CASE WHEN m.winner_id = tp.id THEN 1 END)::int as "wins",
          COUNT(CASE WHEN m.winner_id IS NOT NULL AND m.winner_id != tp.id THEN 1 END)::int as "losses",
          COALESCE(SUM(eh.new_elo - eh.old_elo), 0)::int as "eloChange"
        FROM tournament_participants tp
        LEFT JOIN matches m ON m.tournament_id = tp.tournament_id AND (m.participant1_id = tp.id OR m.participant2_id = tp.id) AND m.winner_id IS NOT NULL
        LEFT JOIN elo_history eh ON eh.match_id = m.id AND eh.user_id = tp.user_id AND eh.tournament_id = tp.tournament_id
        WHERE tp.tournament_id = ${params.id} AND tp.status = 'APPROVED'
        GROUP BY tp.id, tp.nickname_snapshot, tp.team_snapshot
        ORDER BY "wins" DESC, "eloChange" DESC
      `);

      return standings;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/:id/complete",
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, params.id))
        .limit(1);

      if (!tournament) {
        set.status = 404;
        return { error: "Tournament not found" };
      }

      if (tournament.organizerId !== user.id && user.role !== "Admin") {
        set.status = 403;
        return { error: "Forbidden" };
      }

      await db
        .update(tournaments)
        .set({ isCompleted: true })
        .where(eq(tournaments.id, tournament.id));

      return { message: "Tournament marked as completed successfully" };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );

