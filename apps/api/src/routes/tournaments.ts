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
import { eq, and, sql, isNull, desc, asc } from "drizzle-orm";
import { authPlugin, checkRole } from "../middleware/auth";
import { sseManager, SSEClient, publishTournamentUpdate } from "../utils/sse";
import {
  generateSingleElimination,
  generateRoundRobin,
} from "@beefurca/bracket-engine";
import Workbook from "exceljs";

export const tournamentRoutes = new Elysia({ prefix: "/tournaments" })
  .use(authPlugin)
  .get("/disciplines", async () => {
    // Официальные дисциплины - выше, затем по алфавиту.
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

      // Если дисциплина с таким именем уже есть - переиспользуем её,
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
  // создание турнира (STANDARD: организатор/администратор; SANDBOX: любой пользователь)
  .post(
    "/",
    async ({ user, body, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      // Разграничение по режиму турнира:
      //  - STANDARD (с регистрацией и рейтингом) создают Организаторы/Администраторы;
      //  - SANDBOX (автономный учёт) вправе создать любой зарегистрированный пользователь.
      if (body.tournamentType === "STANDARD") {
        checkRole(user, ["Organizer", "Admin"], set);
      } else if (body.tournamentType !== "SANDBOX") {
        set.status = 400;
        return { error: "Invalid tournament type" };
      }

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
          startDate: new Date(body.startDate),
          endDate: body.endDate ? new Date(body.endDate) : null,
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
        startDate: t.String(),
        endDate: t.Optional(t.String()),
        description: t.Optional(t.String()),
      }),
    }
  )
  // список турниров (все роли)
  .get("/", async () => {
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
        disciplineName: disciplines.name,
        organizerId: tournaments.organizerId,
      })
      .from(tournaments)
      .innerJoin(disciplines, eq(tournaments.disciplineId, disciplines.id));
  })
  // детали турнира (с участниками и матчами)
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

      const participants = await db
        .select()
        .from(tournamentParticipants)
        .where(eq(tournamentParticipants.tournamentId, params.id));

      const tournamentMatches = await db
        .select()
        .from(matches)
        .where(eq(matches.tournamentId, params.id));

      const [disc] = await db
        .select({ name: disciplines.name })
        .from(disciplines)
        .where(eq(disciplines.id, tournament.disciplineId))
        .limit(1);

      return {
        tournament: { ...tournament, disciplineName: disc?.name ?? null },
        participants,
        matches: tournamentMatches,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  // редактирование турнира (организатор/администратор)
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
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        entryFee: t.Optional(t.Numeric()),
      }),
    }
  )
  // удаление турнира (только администратор)
  .delete(
    "/:id",
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      if (user.role !== "Admin") {
        set.status = 403;
        return { error: "Только администратор может удалять турниры." };
      }
      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, params.id))
        .limit(1);
      if (!tournament) {
        set.status = 404;
        return { error: "Турнир не найден" };
      }
      await db.delete(tournaments).where(eq(tournaments.id, params.id));
      return { message: "Турнир удалён" };
    },
    { params: t.Object({ id: t.String() }) }
  )
  // подача заявки на турнир (SANDBOX заявки не использует)
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

      // дисциплина: одиночная или командная
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
          status: "PENDING", // STANDARD-турниры требуют подтверждения организатором
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
  // добавление участника по имени вручную (только SANDBOX)
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
            "Manual participant entry is only allowed for SANDBOX tournaments. Use /join for STANDARD.",
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
  // подтверждение заявки участника (организатор)
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
  // отклонение заявки участника (организатор/администратор)
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
  // генерация сетки и старт турнира (организатор)
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

      const enginePlayers = approved.map((ap) => ({
        id: ap.id,
        name: ap.teamSnapshot || ap.nicknameSnapshot,
      }));

      let generatedMatches: any[] = [];
      const bType = tournament.bracketType;

      if (bType === "SINGLE_ELIM") {
        generatedMatches = generateSingleElimination(enginePlayers);
      } else if (bType === "ROUND_ROBIN") {
        generatedMatches = generateRoundRobin(enginePlayers);
      }

      if (generatedMatches.length === 0) {
        set.status = 500;
        return { error: "Failed to generate tournament bracket structure." };
      }

      await db.transaction(async (tx) => {
        await tx
          .update(tournaments)
          .set({ isStarted: true })
          .where(eq(tournaments.id, tournament.id));

        // Для матчей, разрешённых движком как BYE (winnerParticipantId), сразу
        // проставляем winnerId и playedAt - игрок проходит без игры, и сетка не
        // зависает при нечётном числе участников.
        const matchPlaceholders = generatedMatches.map((m) => ({
          tournamentId: tournament.id,
          round: m.round,
          position: m.position,
          participant1Id: m.participant1Id,
          participant2Id: m.participant2Id,
          winnerId: m.winnerParticipantId || null,
          playedAt: m.winnerParticipantId ? new Date() : null,
          refereeId: tournament.organizerId, // организатор - судья по умолчанию
        }));

        const insertedMatches = await tx
          .insert(matches)
          .values(matchPlaceholders)
          .returning();

        // сопоставляем индекс в массиве с id матча в БД
        const indexToIdMap = insertedMatches.map((im) => im.id);

        // Update links: nextMatchId (продвижение победителя по сетке)
        for (let i = 0; i < generatedMatches.length; i++) {
          const gen = generatedMatches[i];
          const dbId = indexToIdMap[i];

          const updates: any = {};
          if (gen.nextMatchIndex !== null) {
            updates.nextMatchId = indexToIdMap[gen.nextMatchIndex];
            updates.nextMatchIsP1 = gen.nextMatchIsP1;
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
  // импорт участников из Excel (организатор)
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

        // пропускаем заголовок; столбец 1 - никнейм, столбец 2 - команда (опционально)
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

        // SANDBOX: участники сразу со статусом APPROVED; STANDARD: сопоставляем никнейм с пользователем БД
        const isSandbox = tournament.tournamentType === "SANDBOX";

        await db.transaction(async (tx) => {
          for (const row of importedRows) {
            let matchedUserId: string | null = null;
            let matchedTeamId: string | null = null;

            if (!isSandbox) {
              const [dbUser] = await tx
                .select({ id: users.id })
                .from(users)
                .where(and(eq(users.nickname, row.nickname), eq(users.isDeleted, false)))
                .limit(1);

              if (dbUser) {
                matchedUserId = dbUser.id;
              }

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

            await tx.insert(tournamentParticipants).values({
              tournamentId: tournament.id,
              userId: matchedUserId,
              teamId: matchedTeamId,
              nicknameSnapshot: row.nickname,
              teamSnapshot: row.teamName || null,
              status: "APPROVED", // импортированные сразу подтверждены
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
  // поток обновлений сетки в реальном времени (SSE)
  .get("/:id/stream", ({ params, set, request }) => {
    const tournamentId = params.id;
    const clientId = crypto.randomUUID();

    set.headers["content-type"] = "text/event-stream";
    set.headers["cache-control"] = "no-cache";
    set.headers["connection"] = "keep-alive";

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
  // массовое назначение судьи на все матчи турнира (организатор)
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
  // турнирная таблица (все роли)
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

      // турнирная таблица рассчитывается на лету
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

      // приводим результат db.execute() (RowList) к простому массиву объектов
      return Array.from(standings as any[]).map((r) => ({ ...r }));
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

