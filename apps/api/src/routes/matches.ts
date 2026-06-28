import { Elysia, t } from "elysia";
import {
  db,
  matches,
  tournaments,
  tournamentParticipants,
  users,
  teamMembers,
  eloHistory,
} from "@beefurca/database";
import { eq, and, or, isNull, inArray } from "drizzle-orm";
import { authPlugin } from "../middleware/auth";
import { publishTournamentUpdate } from "../utils/sse";
import { calculateEloChange, calculateTeamEloChange, getKFactor } from "@beefurca/elo-calculator";
import { redis } from "../utils/redis";

export const matchRoutes = new Elysia({ prefix: "/matches" })
  .use(authPlugin)
  // 1. Submit match score (Referee only)
  .post(
    "/:id/score",
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      // --- REDIS RATE LIMITING FOR REFEREE ENDPOINTS ---
      const rateLimitKey = `rate_limit:matches_score:${user.id}`;
      const requestCount = await redis.incr(rateLimitKey);
      if (requestCount === 1) {
        await redis.expire(rateLimitKey, 10); // 10 seconds window
      }
      if (requestCount > 5) {
        set.status = 429;
        return { error: "Too many match score requests. Please wait 10 seconds." };
      }

      // Fetch match and check exist
      const [match] = await db
        .select()
        .from(matches)
        .where(eq(matches.id, params.id))
        .limit(1);

      if (!match) {
        set.status = 404;
        return { error: "Match not found" };
      }

      // Check if match already has winner
      if (match.winnerId) {
        set.status = 400;
        return { error: "Match results have already been confirmed" };
      }

      // Fetch tournament details
      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, match.tournamentId))
        .limit(1);

      // Verify referee privileges
      // Standard referee: assigned refereeId in match.
      // Amateur/Sandbox: creator of tournament is automatic referee.
      // Organizer: tournament organizer can always update.
      const isCreator = tournament.organizerId === user.id;
      const isAssignedReferee = match.refereeId === user.id;
      const isAdmin = user.role === "Admin";

      if (!isCreator && !isAssignedReferee && !isAdmin) {
        set.status = 403;
        return { error: "Forbidden: You are not authorized to score this match." };
      }

      // Determine winner
      const score1 = body.score1;
      const score2 = body.score2;
      let winnerId: string | null = null;
      let loserId: string | null = null;

      if (score1 > score2) {
        winnerId = match.participant1Id;
        loserId = match.participant2Id;
      } else if (score2 > score1) {
        winnerId = match.participant2Id;
        loserId = match.participant1Id;
      } else if (tournament.bracketType === "SINGLE_ELIM") {
        // В олимпийской системе ничья недопустима: для продвижения по сетке нужен победитель.
        set.status = 400;
        return { error: "Ничья недопустима в олимпийской системе. Введите счёт с победителем." };
      }
      // Круговая система: ничья допустима — матч фиксируется без победителя (winnerId = null).

      await db.transaction(async (tx) => {
        // Update match with scores and winner
        await tx
          .update(matches)
          .set({
            score1,
            score2,
            winnerId,
            isTechDefeat: false,
            playedAt: new Date(),
          })
          .where(eq(matches.id, match.id));

        // --- ELO UPDATE LOGIC ---
        // Начисление рейтинга вынесено в общий помощник applyEloForMatch,
        // чтобы /score и /tech-defeat вели себя одинаково (см. helper ниже).
        await applyEloForMatch(tx, tournament, match, winnerId, loserId);

        // --- ADVANCE WINNER IN BRACKET ---
        if (winnerId) {
          if (match.nextMatchId) {
            const nextMatchCol = match.nextMatchIsP1 ? "participant1Id" : "participant2Id";
            await tx
              .update(matches)
              .set({ [nextMatchCol]: winnerId })
              .where(eq(matches.id, match.nextMatchId));
          }

          // Продвижение могло вскрыть bye (мёртвая ветка) — разрешаем цепочкой
          await resolveByeChain(tx, match.nextMatchId);
        }
      });

      // Оповещаем все инстансы об изменении сетки (PG NOTIFY → SSE)
      await publishTournamentUpdate(tournament.id);

      return { message: "Match score submitted successfully" };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        score1: t.Numeric(),
        score2: t.Numeric(),
      }),
    }
  )
  // 2. Submit Technical Defeat (Referee only)
  .post(
    "/:id/tech-defeat",
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      // --- RATE LIMITING (судейский эндпоинт, как и /score) ---
      const rateLimitKey = `rate_limit:matches_tech_defeat:${user.id}`;
      const requestCount = await redis.incr(rateLimitKey);
      if (requestCount === 1) {
        await redis.expire(rateLimitKey, 10);
      }
      if (requestCount > 5) {
        set.status = 429;
        return { error: "Too many requests. Please wait 10 seconds." };
      }

      // Check match
      const [match] = await db
        .select()
        .from(matches)
        .where(eq(matches.id, params.id))
        .limit(1);

      if (!match) {
        set.status = 404;
        return { error: "Match not found" };
      }

      if (match.winnerId) {
        set.status = 400;
        return { error: "Match results have already been confirmed" };
      }

      // Fetch tournament
      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, match.tournamentId))
        .limit(1);

      // Verify privileges
      const isCreator = tournament.organizerId === user.id;
      const isAssignedReferee = match.refereeId === user.id;
      const isAdmin = user.role === "Admin";

      if (!isCreator && !isAssignedReferee && !isAdmin) {
        set.status = 403;
        return { error: "Forbidden: You are not authorized to score this match." };
      }

      const loserId = body.loserParticipantId;
      if (loserId !== match.participant1Id && loserId !== match.participant2Id) {
        set.status = 400;
        return { error: "Invalid participant selected for tech defeat" };
      }

      const winnerId = loserId === match.participant1Id ? match.participant2Id : match.participant1Id;

      if (!winnerId) {
        set.status = 400;
        return { error: "Cannot award technical defeat: opponent is not yet resolved." };
      }

      await db.transaction(async (tx) => {
        // Update match as technical defeat
        await tx
          .update(matches)
          .set({
            score1: winnerId === match.participant1Id ? 1 : 0,
            score2: winnerId === match.participant2Id ? 1 : 0,
            winnerId,
            isTechDefeat: true,
            playedAt: new Date(),
          })
          .where(eq(matches.id, match.id));

        // Техническое поражение — полноценный исход матча: начисляем ELO так же,
        // как при обычном вводе счёта.
        await applyEloForMatch(tx, tournament, match, winnerId, loserId);

        // Advance winner
        if (match.nextMatchId) {
          const nextMatchCol = match.nextMatchIsP1 ? "participant1Id" : "participant2Id";
          await tx
            .update(matches)
            .set({ [nextMatchCol]: winnerId })
            .where(eq(matches.id, match.nextMatchId));
        }

        // Разрешаем возможные bye, вскрывшиеся после продвижения
        await resolveByeChain(tx, match.nextMatchId);
      });

      // Оповещаем все инстансы об изменении сетки (PG NOTIFY → SSE)
      await publishTournamentUpdate(tournament.id);

      return { message: "Technical defeat registered successfully." };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        loserParticipantId: t.String(),
      }),
    }
  )
  .put(
    "/:id/referee",
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const [match] = await db
        .select()
        .from(matches)
        .where(eq(matches.id, params.id))
        .limit(1);

      if (!match) {
        set.status = 404;
        return { error: "Match not found" };
      }

      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, match.tournamentId))
        .limit(1);

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
          return { error: "Selected referee user not found" };
        }
      }

      await db
        .update(matches)
        .set({ refereeId: body.refereeId || null })
        .where(eq(matches.id, match.id));

      // Оповещаем все инстансы об изменении сетки (PG NOTIFY → SSE)
      await publishTournamentUpdate(tournament.id);

      return { message: "Referee updated for match successfully." };
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
  // Обновить счёт в прямом эфире без финализации матча.
  // Судья нажимает +/- → счёт транслируется на табло через SSE в реальном времени.
  // Победитель не определяется — для финализации используется POST /:id/score.
  .put(
    "/:id/live-score",
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const [match] = await db
        .select()
        .from(matches)
        .where(eq(matches.id, params.id))
        .limit(1);

      if (!match) {
        set.status = 404;
        return { error: "Match not found" };
      }

      if (match.winnerId) {
        set.status = 400;
        return { error: "Match already finalized" };
      }

      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, match.tournamentId))
        .limit(1);

      const isCreator = tournament.organizerId === user.id;
      const isAssignedReferee = match.refereeId === user.id;
      const isAdmin = user.role === "Admin";

      if (!isCreator && !isAssignedReferee && !isAdmin) {
        set.status = 403;
        return { error: "Forbidden" };
      }

      await db
        .update(matches)
        .set({ score1: body.score1, score2: body.score2 })
        .where(eq(matches.id, match.id));

      await publishTournamentUpdate(tournament.id);
      return { message: "Live score updated" };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ score1: t.Numeric(), score2: t.Numeric() }),
    }
  );

// --- HELPERS ---

/**
 * Рантайм-разрешение BYE. После того как победитель помещён в слот матча,
 * этот матч может оказаться bye: один участник есть, а второй слот никогда не
 * заполнится (нет неразрешённого матча-питателя, ведущего в пустой слот —
 * например, «мёртвая» ветка при нечётном числе участников). Тогда объявляем
 * единственного участника победителем без игры и продвигаем дальше по цепочке.
 */
async function resolveByeChain(tx: any, startMatchId: string | null): Promise<void> {
  let currentId: string | null = startMatchId;
  // ограничение на число итераций — страховка от зацикливания
  for (let guard = 0; currentId && guard < 256; guard++) {
    const [m] = await tx
      .select()
      .from(matches)
      .where(eq(matches.id, currentId))
      .limit(1);

    if (!m || m.winnerId) break;

    let soleWinner: string | null = null;
    if (m.participant1Id && !m.participant2Id) soleWinner = m.participant1Id;
    else if (m.participant2Id && !m.participant1Id) soleWinner = m.participant2Id;
    else break; // оба слота заняты (играбельный матч) или оба пусты — не bye

    const emptyIsP1 = !m.participant1Id; // какой слот пуст

    // Есть ли ещё не сыгранный матч, который пришлёт участника в пустой слот?
    const [pendingFeeder] = await tx
      .select({ id: matches.id })
      .from(matches)
      .where(
        and(
          isNull(matches.winnerId),
          eq(matches.nextMatchId, m.id),
          eq(matches.nextMatchIsP1, emptyIsP1)
        )
      )
      .limit(1);

    if (pendingFeeder) break; // слот ещё будет заполнен — это не bye

    // Объявляем bye-победу и продвигаем дальше
    await tx
      .update(matches)
      .set({ winnerId: soleWinner, playedAt: new Date() })
      .where(eq(matches.id, m.id));

    if (m.nextMatchId) {
      const nextCol = m.nextMatchIsP1 ? "participant1Id" : "participant2Id";
      await tx
        .update(matches)
        .set({ [nextCol]: soleWinner })
        .where(eq(matches.id, m.nextMatchId));
    }

    currentId = m.nextMatchId;
  }
}

/**
 * Начисляет ELO по результату матча и пишет историю в elo_history.
 * Вызывается из /score и /tech-defeat, чтобы оба пути давали одинаковый
 * рейтинговый эффект. Рейтинг меняется только в STANDARD-турнирах (kFactor = 32);
 * SANDBOX (автономный учёт) ELO не затрагивает.
 */
async function applyEloForMatch(
  tx: any,
  tournament: any,
  match: { id: string; participant1Id: string | null; participant2Id: string | null },
  winnerId: string | null,
  loserId: string | null
): Promise<void> {
  const kFactor = getKFactor(tournament.tournamentType);

  if (kFactor <= 0 || !winnerId || !loserId) return;
  if (!match.participant1Id || !match.participant2Id) return;

  const [part1] = await tx
    .select()
    .from(tournamentParticipants)
    .where(eq(tournamentParticipants.id, match.participant1Id))
    .limit(1);

  const [part2] = await tx
    .select()
    .from(tournamentParticipants)
    .where(eq(tournamentParticipants.id, match.participant2Id))
    .limit(1);

  if (part1.userId && part2.userId) {
    // SINGLE: обновляем рейтинг двух игроков
    const [user1] = await tx
      .select({ elo: users.elo })
      .from(users)
      .where(eq(users.id, part1.userId))
      .limit(1);

    const [user2] = await tx
      .select({ elo: users.elo })
      .from(users)
      .where(eq(users.id, part2.userId))
      .limit(1);

    const score1Val = winnerId === part1.id ? 1 : 0;
    const score2Val = winnerId === part2.id ? 1 : 0;

    const eloChange = calculateEloChange(
      user1.elo,
      user2.elo,
      score1Val,
      score2Val,
      kFactor
    );

    await tx
      .update(users)
      .set({ elo: eloChange.newRatingA })
      .where(eq(users.id, part1.userId));
    await tx.insert(eloHistory).values({
      userId: part1.userId,
      matchId: match.id,
      tournamentId: tournament.id,
      oldElo: user1.elo,
      newElo: eloChange.newRatingA,
    });

    await tx
      .update(users)
      .set({ elo: eloChange.newRatingB })
      .where(eq(users.id, part2.userId));
    await tx.insert(eloHistory).values({
      userId: part2.userId,
      matchId: match.id,
      tournamentId: tournament.id,
      oldElo: user2.elo,
      newElo: eloChange.newRatingB,
    });
  } else if (part1.teamId && part2.teamId) {
    // TEAM: обновляем рейтинг всех игроков обоих ростеров
    const teamMembersA = await tx
      .select({ playerId: teamMembers.playerId, elo: users.elo })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.playerId, users.id))
      .where(eq(teamMembers.teamId, part1.teamId));

    const teamMembersB = await tx
      .select({ playerId: teamMembers.playerId, elo: users.elo })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.playerId, users.id))
      .where(eq(teamMembers.teamId, part2.teamId));

    const ratingsA = teamMembersA.map((m: any) => m.elo);
    const ratingsB = teamMembersB.map((m: any) => m.elo);

    const score1Val = winnerId === part1.id ? 1 : 0;
    const score2Val = winnerId === part2.id ? 1 : 0;

    const teamEloChange = calculateTeamEloChange(
      ratingsA,
      ratingsB,
      score1Val,
      score2Val,
      kFactor
    );

    for (let i = 0; i < teamMembersA.length; i++) {
      const member = teamMembersA[i];
      const newRating = teamEloChange.newRatingsA[i];
      await tx.update(users).set({ elo: newRating }).where(eq(users.id, member.playerId));
      await tx.insert(eloHistory).values({
        userId: member.playerId,
        matchId: match.id,
        tournamentId: tournament.id,
        oldElo: member.elo,
        newElo: newRating,
      });
    }

    for (let i = 0; i < teamMembersB.length; i++) {
      const member = teamMembersB[i];
      const newRating = teamEloChange.newRatingsB[i];
      await tx.update(users).set({ elo: newRating }).where(eq(users.id, member.playerId));
      await tx.insert(eloHistory).values({
        userId: member.playerId,
        matchId: match.id,
        tournamentId: tournament.id,
        oldElo: member.elo,
        newElo: newRating,
      });
    }
  }

  // Рейтинги изменились — сбрасываем кэш лидербордов дисциплины
  await clearLeaderboardCache(tournament.disciplineId);
}

async function clearLeaderboardCache(disciplineId: string) {
  // Clear leaderboard Redis cache keys
  const pattern = `leaderboard:${disciplineId}:*`;
  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== "0");
}
