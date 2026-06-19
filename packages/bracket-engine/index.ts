import { Participant, GeneratedMatch, SwissRoundPlayer } from "./types";

/**
 * Returns the next power of 2 greater than or equal to n.
 */
function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  let power = 1;
  while (power < n) {
    power *= 2;
  }
  return power;
}

/**
 * Авто-разрешение BYE: проходит по сетке и для матчей, у которых один слот
 * заполнен, а второй НИКОГДА не будет заполнен (нет участника и нет матча-
 * предшественника, который туда что-то пришлёт), объявляет единственного
 * участника победителем без игры и протягивает его в следующий матч.
 * Корректно обрабатывает цепочки байов и «мёртвые» матчи (оба слота пусты),
 * в том числе нижнюю сетку double elimination (учитывает loserNextMatchIndex).
 * Мутирует массив на месте, проставляя winnerParticipantId.
 */
function resolveByes(matches: GeneratedMatch[]): void {
  // Счётчик ожидаемых «питателей» для каждого слота: ключ `${index}:${isP1}`.
  const feeders = new Map<string, number>();
  const key = (idx: number, isP1: boolean | null | undefined) => `${idx}:${isP1 ? "1" : "0"}`;
  const addFeeder = (idx: number, isP1: boolean | null | undefined) =>
    feeders.set(key(idx, isP1), (feeders.get(key(idx, isP1)) || 0) + 1);
  const removeFeeder = (idx: number, isP1: boolean | null | undefined) => {
    const k = key(idx, isP1);
    const v = feeders.get(k) || 0;
    if (v > 0) feeders.set(k, v - 1);
  };
  const slotHasFeeder = (idx: number, isP1: boolean) => (feeders.get(key(idx, isP1)) || 0) > 0;

  matches.forEach((m) => {
    if (m.nextMatchIndex != null) addFeeder(m.nextMatchIndex, m.nextMatchIsP1);
    if (m.loserNextMatchIndex != null) addFeeder(m.loserNextMatchIndex, m.loserNextMatchIsP1);
  });

  const resolved = new Set<number>();
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < matches.length; i++) {
      if (resolved.has(i)) continue;
      const m = matches[i];
      if (m.winnerParticipantId) continue;

      const p1Empty = m.participant1Id == null && !slotHasFeeder(i, true);
      const p2Empty = m.participant2Id == null && !slotHasFeeder(i, false);

      const advance = (winner: string) => {
        m.winnerParticipantId = winner;
        resolved.add(i);
        if (m.nextMatchIndex != null) {
          const t = matches[m.nextMatchIndex];
          if (m.nextMatchIsP1) t.participant1Id = winner;
          else t.participant2Id = winner;
          removeFeeder(m.nextMatchIndex, m.nextMatchIsP1);
        }
        // У bye-победителя нет проигравшего соперника — снимаем loser-питатель.
        if (m.loserNextMatchIndex != null) removeFeeder(m.loserNextMatchIndex, m.loserNextMatchIsP1);
        changed = true;
      };

      if (m.participant1Id != null && p2Empty) {
        advance(m.participant1Id);
      } else if (m.participant2Id != null && p1Empty) {
        advance(m.participant2Id);
      } else if (p1Empty && p2Empty) {
        // «Мёртвый» матч: участники не придут никогда — снимаем все питатели.
        resolved.add(i);
        if (m.nextMatchIndex != null) removeFeeder(m.nextMatchIndex, m.nextMatchIsP1);
        if (m.loserNextMatchIndex != null) removeFeeder(m.loserNextMatchIndex, m.loserNextMatchIsP1);
        changed = true;
      }
    }
  }
}

/**
 * Generates a Single Elimination bracket.
 * If the number of participants is not a power of 2, it pads with byes (null).
 * @param resolve когда true (по умолчанию), автоматически разрешает bye-матчи.
 *   При сборке winners-сетки для double elimination передаётся false, чтобы
 *   bye-разрешение выполнялось один раз поверх полной структуры с loser-связями.
 */
export function generateSingleElimination(
  participants: Participant[],
  resolve: boolean = true
): GeneratedMatch[] {
  const numPlayers = participants.length;
  if (numPlayers === 0) return [];

  const size = nextPowerOfTwo(numPlayers);
  const matches: GeneratedMatch[] = [];

  // We build the bracket from the finals back to the first round.
  // This helps establish links easily.
  // Final round is Round X.
  // Total rounds: log2(size)
  const totalRounds = Math.log2(size);

  // We will build the matches array. To resolve nextMatchIndex,
  // we can create matches in reverse order: final match first, then semi-finals, etc.
  // Final Match: Round = totalRounds, Position = 0
  // Next round back: Round = totalRounds - 1, 2 matches
  // So for round R, there are 2^(totalRounds - R) matches.
  
  // Let's create an array of matches where the final is at index 0.
  // Round R, Position P (0-indexed)
  // The match at index `i` has child match at index `Math.floor((i - 1) / 2)`.
  // If `i` is odd, it goes to participant1 (nextMatchIsP1 = true). If even, participant2.
  
  // Total matches in a full tree of size S: S - 1
  const totalMatchesCount = size - 1;
  
  // Initialize placeholders
  for (let i = 0; i < totalMatchesCount; i++) {
    matches.push({
      round: 0,
      position: 0,
      participant1Id: null,
      participant2Id: null,
      nextMatchIndex: null,
      nextMatchIsP1: null,
    });
  }

  // Populate round, position and nextMatch links
  let matchIndex = 0;
  for (let r = totalRounds; r >= 1; r--) {
    const roundMatchesCount = Math.pow(2, totalRounds - r);
    for (let p = 0; p < roundMatchesCount; p++) {
      matches[matchIndex].round = r;
      matches[matchIndex].position = p;
      
      if (matchIndex > 0) {
        const parentIndex = Math.floor((matchIndex - 1) / 2);
        matches[matchIndex].nextMatchIndex = parentIndex;
        matches[matchIndex].nextMatchIsP1 = matchIndex % 2 !== 0;
      }
      
      matchIndex++;
    }
  }

  // Now we need to fill in the participants for the first round.
  // The first round matches are at the end of the matches array.
  // For size = 8, totalMatchesCount = 7.
  // Round 1 matches are positions 0, 1, 2, 3.
  // They correspond to indices 3, 4, 5, 6 in our array.
  // Let's find indices of Round 1 matches:
  const firstRoundStartIndex = totalMatchesCount - (size / 2);

  // Standard seeding (1 vs 8, 4 vs 5, etc.) or simple sequential placement.
  // For a simple robust bracket, let's place participants sequentially,
  // padding with null for byes.
  const paddedParticipants: (string | null)[] = new Array(size).fill(null);
  for (let i = 0; i < numPlayers; i++) {
    paddedParticipants[i] = participants[i].id;
  }

  // Distribute players to Round 1 matches
  for (let i = 0; i < size / 2; i++) {
    const idx = firstRoundStartIndex + i;
    matches[idx].participant1Id = paddedParticipants[2 * i];
    matches[idx].participant2Id = paddedParticipants[2 * i + 1];
  }

  // Return matches in chronological order (Round 1 first, then Round 2, etc.)
  // This is easier to display and save.
  const result = matches.reverse().map((m) => {
    // Need to adjust the nextMatchIndex because we reversed the array
    let nextRevIndex: number | null = null;
    if (m.nextMatchIndex !== null) {
      nextRevIndex = totalMatchesCount - 1 - m.nextMatchIndex;
    }
    return {
      round: m.round,
      position: m.position,
      participant1Id: m.participant1Id,
      participant2Id: m.participant2Id,
      nextMatchIndex: nextRevIndex,
      nextMatchIsP1: m.nextMatchIsP1,
    };
  });

  // Авто-продвижение игроков с bye (нечётное число участников)
  if (resolve) resolveByes(result);

  return result;
}

/**
 * Generates a Double Elimination bracket.
 * Returns Winners Bracket, Losers Bracket, and Grand Final matches.
 */
export function generateDoubleElimination(
  participants: Participant[]
): GeneratedMatch[] {
  const numPlayers = participants.length;
  if (numPlayers === 0) return [];

  const size = nextPowerOfTwo(numPlayers);
  
  // Winners bracket is just a single elimination bracket.
  // resolve=false: bye-разрешение выполним один раз в конце, когда добавим
  // loser-связи (иначе проигравших байов в нижнюю сетку посчитаем неверно).
  const winnersMatches = generateSingleElimination(participants, false).map(m => ({
    ...m,
    type: "winners" as const,
  }));

  // Total matches in Winners Bracket: size - 1
  // We need to map losers from Winners Round X to Losers Round Y.
  // Let's create the Losers Bracket.
  // Winners Round 1 losers go to Losers Round 1.
  // Winners Round 2 losers go to Losers Round 2.
  // In Double Elimination, Losers Bracket has twice as many rounds as Winners Bracket (minus one).
  // Winners rounds = log2(size). Losers rounds = 2 * log2(size) - 2.
  // E.g., for size = 8 (Winners: 3 rounds):
  // Winners R1 (4 matches) -> losers go to Losers R1 (2 matches)
  // Winners R2 (2 matches) -> losers go to Losers R2 (2 matches)
  // Losers R1 winners (2) play each other in Losers R2?
  // Let's define the standard structure:
  // Losers Round 1: Winners R1 losers play. (size/4 matches)
  // Losers Round 2: Winners R2 losers play Losers Round 1 winners. (size/4 matches)
  // Losers Round 3: Losers Round 2 winners play each other. (size/8 matches)
  // Losers Round 4: Winners R3 losers play Losers Round 3 winners. (size/8 matches)
  // And so on, alternating.
  
  const losersMatches: GeneratedMatch[] = [];
  const totalWinnersRounds = Math.log2(size);
  
  // For a robust and simple implementation of Double Elimination, we will construct
  // Winners matches, Losers matches, and the Grand Final match.
  // Let's create placeholders for Losers matches and write a mapping algorithm.
  
  // E.g., for size = 8 (totalWinnersRounds = 3)
  // Winners matches:
  // R1: 4 matches (pos 0..3)
  // R2: 2 matches (pos 0..1)
  // R3: 1 match (pos 0) (Winners Final)
  
  // Losers matches:
  // LR1: 2 matches (pos 0..1) - receives Winners R1 losers.
  // LR2: 2 matches (pos 0..1) - receives Winners R2 losers + LR1 winners.
  // LR3: 1 match (pos 0) - LR2 winners play each other.
  // LR4: 1 match (pos 0) - receives Winners R3 loser (Winners Final loser) + LR3 winner.
  // LR5: (Losers Final) - LR4 winner?
  // Actually, for size = 8, the rounds in Losers are:
  // LR1: 2 matches
  // LR2: 2 matches (receives Winners R2 losers)
  // LR3: 1 match
  // LR4: 1 match (receives Winners R3 loser - Winners Final loser)
  // Total Losers Matches = 2 + 2 + 1 + 1 = 6 matches.
  // Winners Matches = 7 matches.
  // Grand Final = 1 match (Winners R3 winner vs Losers LR4 winner).
  // Grand Final Reset = 1 match (if Losers winner wins the first Grand Final).
  
  // Let's build a unified array of matches.
  // Winners matches are already generated. We will append Losers matches.
  // To avoid complex graph structures, we will list the matches and set links:
  // Each winners match has:
  // - nextMatchIndex (if they win)
  // - loserNextMatchIndex (if they lose) -> maps to Losers Bracket match.
  // Let's design a flat list of all matches, and specify for each:
  // nextMatchIndex, nextMatchIsP1.
  
  const allMatches: GeneratedMatch[] = [];
  
  // 1. Add Winners Bracket
  allMatches.push(...winnersMatches);
  
  // 2. Add Losers Bracket matches
  // For size = 8, we add:
  // LR1 (2 matches, round = 1, pos = 0..1, type = "losers")
  // LR2 (2 matches, round = 2, pos = 0..1, type = "losers")
  // LR3 (1 match, round = 3, pos = 0, type = "losers")
  // LR4 (1 match, round = 4, pos = 0, type = "losers")
  
  // Let's write a general loop to create losers matches for any power of two `size`.
  // The number of losers rounds is 2 * totalWinnersRounds - 2.
  // E.g., for size = 8, rounds = 4.
  // For size = 16, rounds = 6. (LR1: 4, LR2: 4, LR3: 2, LR4: 2, LR5: 1, LR6: 1)
  const losersRoundsCount = 2 * totalWinnersRounds - 2;
  const losersRoundsMatches: GeneratedMatch[][] = [];
  
  let currentLosersMatchesCount = size / 4; // for LR1
  for (let r = 1; r <= losersRoundsCount; r++) {
    const roundMatches: GeneratedMatch[] = [];
    for (let p = 0; p < currentLosersMatchesCount; p++) {
      roundMatches.push({
        round: r,
        position: p,
        participant1Id: null,
        participant2Id: null,
        nextMatchIndex: null,
        nextMatchIsP1: null,
        type: "losers",
      });
    }
    losersRoundsMatches.push(roundMatches);
    
    // The number of matches in losers bracket only decreases every 2 rounds.
    if (r % 2 === 0) {
      currentLosersMatchesCount /= 2;
    }
  }
  
  // Flatten losers rounds and add to allMatches. Keep track of indices.
  const losersStartIndex = allMatches.length;
  for (let r = 0; r < losersRoundsMatches.length; r++) {
    allMatches.push(...losersRoundsMatches[r]);
  }
  
  // Helper to find a losers match index in allMatches
  const getLosersMatchIndex = (round: number, position: number): number => {
    let indexOffset = losersStartIndex;
    for (let r = 0; r < round - 1; r++) {
      indexOffset += losersRoundsMatches[r].length;
    }
    return indexOffset + position;
  };

  // 3. Connect Losers Bracket matches to each other
  for (let r = 1; r <= losersRoundsCount; r++) {
    const currentRoundMatches = losersRoundsMatches[r - 1];
    const isEvenRound = r % 2 === 0;
    
    for (let p = 0; p < currentRoundMatches.length; p++) {
      const matchIdx = getLosersMatchIndex(r, p);
      
      if (r === losersRoundsCount) {
        // Losers Final goes to Grand Final!
        // We will add the Grand Final match at the end.
      } else {
        if (isEvenRound) {
          // Even round LR2 -> LR3: 2 matches go to 1 match.
          // Match p goes to position Math.floor(p/2) in round r+1
          const nextRound = r + 1;
          const nextPos = Math.floor(p / 2);
          const nextMatchIdx = getLosersMatchIndex(nextRound, nextPos);
          allMatches[matchIdx].nextMatchIndex = nextMatchIdx;
          allMatches[matchIdx].nextMatchIsP1 = p % 2 === 0;
        } else {
          // Odd round LR1 -> LR2: 2 matches go to 2 matches (p goes to p)
          // Here, they play against winners losers from Winners R2.
          const nextRound = r + 1;
          const nextPos = p;
          const nextMatchIdx = getLosersMatchIndex(nextRound, nextPos);
          allMatches[matchIdx].nextMatchIndex = nextMatchIdx;
          // In even round, LR1 winners usually enter as participant 2.
          allMatches[matchIdx].nextMatchIsP1 = false;
        }
      }
    }
  }

  // 4. Add Grand Final Match
  const grandFinalIndex = allMatches.length;
  allMatches.push({
    round: totalWinnersRounds + 1,
    position: 0,
    participant1Id: null, // will receive Winners Bracket final winner
    participant2Id: null, // will receive Losers Bracket final winner (LR final)
    nextMatchIndex: null,
    nextMatchIsP1: null,
    type: "grand_final",
  });

  // Grand Final Reset Match (if Losers winner wins, they play a reset)
  const grandFinalResetIndex = allMatches.length;
  allMatches.push({
    round: totalWinnersRounds + 2,
    position: 0,
    participant1Id: null,
    participant2Id: null,
    nextMatchIndex: null,
    nextMatchIsP1: null,
    type: "grand_final_reset",
  });

  // Connect Losers Final to Grand Final (it becomes participant 2)
  const losersFinalIdx = getLosersMatchIndex(losersRoundsCount, 0);
  allMatches[losersFinalIdx].nextMatchIndex = grandFinalIndex;
  allMatches[losersFinalIdx].nextMatchIsP1 = false;

  // Connect Winners Final to Grand Final (it becomes participant 1)
  // Winners Final is the last match in the Winners section, which is index winnersMatches.length - 1
  const winnersFinalIdx = winnersMatches.length - 1;
  allMatches[winnersFinalIdx].nextMatchIndex = grandFinalIndex;
  allMatches[winnersFinalIdx].nextMatchIsP1 = true;

  // Note: Winners bracket matches already have nextMatchIndex configured for single elim.
  // We need to override the Winners Final nextMatchIndex to point to the Grand Final.
  allMatches[winnersFinalIdx].nextMatchIndex = grandFinalIndex;
  allMatches[winnersFinalIdx].nextMatchIsP1 = true;

  // Маппинг проигравших: проигравший из раунда Winners уходит в нижнюю сетку.
  // Winners R1 -> Losers R1; Winners R_k (k>=2) -> Losers R(2k-2);
  // Winners Final -> Losers Final. Связи хранятся в полях loserNextMatchIndex/
  // loserNextMatchIsP1 каждого матча и сохраняются бэкендом в БД
  // (matches.loser_next_match_id), поэтому продвижение проигравшего на бэкенде
  // тривиально — без пересчёта математики сетки во время игры.

  // Winners Round 1 -> Losers Round 1.
  // Winners R1 has size/2 matches. Losers R1 has size/4 matches.
  // Match p in Winners R1 goes to position Math.floor(p/2) in Losers R1.
  // If p is even, it goes to P1, if odd, to P2.
  const winnersR1Matches = allMatches.filter(m => m.type === "winners" && m.round === 1);
  for (let p = 0; p < winnersR1Matches.length; p++) {
    const winnersMatchIdx = p; // since Winners R1 is at the beginning of the list
    const losersMatchIdx = getLosersMatchIndex(1, Math.floor(p / 2));
    (allMatches[winnersMatchIdx] as any).loserNextMatchIndex = losersMatchIdx;
    (allMatches[winnersMatchIdx] as any).loserNextMatchIsP1 = p % 2 === 0;
  }

  // Winners Round R (R > 1) -> Losers Round (2R - 2).
  // Winners Round R has size / (2^R) matches.
  // Losers Round (2R - 2) has the same number of matches!
  // So Winners Round R match p maps directly to Losers Round (2R - 2) match p (or a reversed/crossed position to avoid immediate rematch).
  // Cross mapping: to avoid playing the same opponent, we can map:
  // pos p -> pos (p + half) % count.
  // E.g., for R = 2, count = 2. pos 0 -> pos 1, pos 1 -> pos 0.
  // Let's implement this cross mapping:
  for (let r = 2; r < totalWinnersRounds; r++) {
    const roundMatchesCount = size / Math.pow(2, r);
    // Find winners matches for this round
    const startIdx = allMatches.findIndex(m => m.type === "winners" && m.round === r);
    
    const losersRound = 2 * r - 2;
    for (let p = 0; p < roundMatchesCount; p++) {
      const winnersMatchIdx = startIdx + p;
      // Cross mapping pos:
      const crossedPos = (p + Math.floor(roundMatchesCount / 2)) % roundMatchesCount;
      const losersMatchIdx = getLosersMatchIndex(losersRound, crossedPos);
      
      (allMatches[winnersMatchIdx] as any).loserNextMatchIndex = losersMatchIdx;
      // Losers of Winners R >= 2 always enter as participant 1 of the even losers round
      (allMatches[winnersMatchIdx] as any).loserNextMatchIsP1 = true;
    }
  }

  // Winners Final (Winners R_last) -> Losers Final round (Losers R_last)
  // Winners Final loser goes to Losers Final match.
  const winnersFinalIdxInAll = winnersMatches.length - 1;
  const losersFinalIdxInAll = getLosersMatchIndex(losersRoundsCount, 0);
  (allMatches[winnersFinalIdxInAll] as any).loserNextMatchIndex = losersFinalIdxInAll;
  (allMatches[winnersFinalIdxInAll] as any).loserNextMatchIsP1 = true; // Loser of Winners Final enters as P1 in Losers Final.

  // Авто-продвижение байов поверх полной структуры (winners + losers + финалы):
  // выполняется один раз здесь, когда все loser-связи уже проставлены.
  resolveByes(allMatches);

  return allMatches;
}

/**
 * Generates a Round Robin (Круговая) tournament structure.
 * Standard circle method.
 */
export function generateRoundRobin(
  participants: Participant[]
): GeneratedMatch[] {
  const numPlayers = participants.length;
  if (numPlayers < 2) return [];

  // If odd, add a dummy bye player
  const list = [...participants];
  const hasBye = numPlayers % 2 !== 0;
  if (hasBye) {
    list.push({ id: "bye", name: "BYE" });
  }

  const n = list.length;
  const matches: GeneratedMatch[] = [];
  const roundsCount = n - 1;

  for (let round = 1; round <= roundsCount; round++) {
    for (let i = 0; i < n / 2; i++) {
      const p1 = list[i];
      const p2 = list[n - 1 - i];

      // Skip match if one of the participants is bye
      if (p1.id !== "bye" && p2.id !== "bye") {
        matches.push({
          round,
          position: i,
          participant1Id: p1.id,
          participant2Id: p2.id,
          nextMatchIndex: null,
          nextMatchIsP1: null,
        });
      }
    }

    // Rotate list (keep first element fixed, shift others)
    const last = list[n - 1];
    for (let k = n - 1; k > 1; k--) {
      list[k] = list[k - 1];
    }
    list[1] = last;
  }

  return matches;
}

/**
 * Generates Swiss Round 1 matches.
 * Sorts by random seed or simple order, splits in halves, and pairs.
 */
export function generateSwissRound1(
  participants: Participant[]
): GeneratedMatch[] {
  const numPlayers = participants.length;
  if (numPlayers < 2) return [];

  // If odd number, one player gets a bye. For Round 1, let's pick the last player as bye.
  const list = [...participants];
  const hasBye = numPlayers % 2 !== 0;
  let byePlayerId: string | null = null;
  if (hasBye) {
    byePlayerId = list.pop()?.id || null;
  }

  const matches: GeneratedMatch[] = [];
  const half = list.length / 2;

  for (let i = 0; i < half; i++) {
    matches.push({
      round: 1,
      position: i,
      participant1Id: list[i].id,
      participant2Id: list[half + i].id,
      nextMatchIndex: null,
      nextMatchIsP1: null,
    });
  }

  // Handle bye match if any (represented as a match with P2 = null)
  if (byePlayerId) {
    matches.push({
      round: 1,
      position: half,
      participant1Id: byePlayerId,
      participant2Id: null, // P2 = null means BYE
      nextMatchIndex: null,
      nextMatchIsP1: null,
    });
  }

  return matches;
}

/**
 * Generates the NEXT Swiss Round matches based on history.
 * Groups players by current points, calculates Buchholz scores, and pairs.
 * Avoids duplicate matches.
 */
export function generateNextSwissRound(
  players: SwissRoundPlayer[],
  roundNumber: number
): GeneratedMatch[] {
  // 1. Sort players by points (primary) and Buchholz score (secondary)
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    return b.buchholz - a.buchholz;
  });

  const matchedIds = new Set<string>();
  const matches: GeneratedMatch[] = [];
  let position = 0;

  // Handle bye first if number of active players is odd.
  // The player with the lowest score who has NOT had a bye yet gets the bye.
  // In this model, we can represent bye as opponent "bye" in history.
  const oddCount = sortedPlayers.length % 2 !== 0;
  if (oddCount) {
    // Find candidate for bye from the bottom of the list
    for (let i = sortedPlayers.length - 1; i >= 0; i--) {
      const player = sortedPlayers[i];
      if (!player.opponents.includes("bye")) {
        matches.push({
          round: roundNumber,
          position,
          participant1Id: player.id,
          participant2Id: null, // P2 = null indicates BYE
          nextMatchIndex: null,
          nextMatchIsP1: null,
        });
        matchedIds.add(player.id);
        position++;
        break;
      }
    }
  }

  // Pair remaining players using a backtracking matching algorithm
  const remainingPlayers = sortedPlayers.filter(p => !matchedIds.has(p.id));
  const pairing = pairSwissPlayers(remainingPlayers);

  if (pairing) {
    for (const [p1, p2] of pairing) {
      matches.push({
        round: roundNumber,
        position,
        participant1Id: p1.id,
        participant2Id: p2.id,
        nextMatchIndex: null,
        nextMatchIsP1: null,
      });
      position++;
    }
  } else {
    // Fallback: if no valid pairing is possible without duplicates,
    // we force pair them ignoring the no-rematch rule just to make the bracket work.
    const fallbackList = [...remainingPlayers];
    while (fallbackList.length >= 2) {
      const p1 = fallbackList.shift()!;
      const p2 = fallbackList.shift()!;
      matches.push({
        round: roundNumber,
        position,
        participant1Id: p1.id,
        participant2Id: p2.id,
        nextMatchIndex: null,
        nextMatchIsP1: null,
      });
      position++;
    }
  }

  return matches;
}

/**
 * Simple backtracking Swiss pairing algorithm.
 */
function pairSwissPlayers(
  players: SwissRoundPlayer[]
): [SwissRoundPlayer, SwissRoundPlayer][] | null {
  if (players.length === 0) return [];
  if (players.length % 2 !== 0) return null; // Should be even here after bye handled

  const first = players[0];
  
  for (let i = 1; i < players.length; i++) {
    const candidate = players[i];
    
    // Check if they have already played each other
    if (!first.opponents.includes(candidate.id)) {
      const subList = players.filter(p => p.id !== first.id && p.id !== candidate.id);
      const subPairing = pairSwissPlayers(subList);
      
      if (subPairing !== null) {
        return [[first, candidate], ...subPairing];
      }
    }
  }
  
  return null;
}

/**
 * Calculates Buchholz score for each player.
 * Buchholz = sum of opponents' points.
 */
export function calculateBuchholz(players: SwissRoundPlayer[]): SwissRoundPlayer[] {
  const pointsMap = new Map<string, number>();
  for (const p of players) {
    pointsMap.set(p.id, p.points);
  }

  return players.map(player => {
    let sum = 0;
    for (const oppId of player.opponents) {
      if (oppId !== "bye") {
        sum += pointsMap.get(oppId) || 0;
      }
    }
    return {
      ...player,
      buchholz: sum,
    };
  });
}
