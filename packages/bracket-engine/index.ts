import { Participant, GeneratedMatch } from "./types";

/**
 * Standard tournament bracket seeding.
 * Returns slot indices in seeding priority order (seed 1, seed 2, seed 3, …).
 * Placing players at these slot positions distributes byes evenly so that
 * no two null slots land in the same first-round pair, eliminating dead matches.
 *
 * Examples (0-indexed):
 *   size=2: [0, 1]
 *   size=4: [0, 3, 1, 2]
 *   size=8: [0, 7, 3, 4, 1, 6, 2, 5]
 */
function standardSeeding(size: number): number[] {
  if (size === 1) return [0];
  const prev = standardSeeding(size / 2);
  const result: number[] = [];
  for (const p of prev) {
    result.push(p);
    result.push(size - 1 - p);
  }
  return result;
}

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
 * Корректно обрабатывает цепочки байов и «мёртвые» матчи (оба слота пусты).
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
        changed = true;
      };

      if (m.participant1Id != null && p2Empty) {
        advance(m.participant1Id);
      } else if (m.participant2Id != null && p1Empty) {
        advance(m.participant2Id);
      } else if (p1Empty && p2Empty) {
        // «Мёртвый» матч: участники не придут никогда — снимаем питатель.
        resolved.add(i);
        if (m.nextMatchIndex != null) removeFeeder(m.nextMatchIndex, m.nextMatchIsP1);
        changed = true;
      }
    }
  }
}

/**
 * Generates a Single Elimination bracket.
 * If the number of participants is not a power of 2, it pads with byes (null).
 * @param resolve когда true (по умолчанию), автоматически разрешает bye-матчи.
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

  // Distribute players into slots using standard tournament seeding.
  // Byes (null) end up at the remaining slot positions, always separated by at
  // least one real player, so no pair can be (null, null) — no dead matches.
  const seededSlots = standardSeeding(size);
  const paddedParticipants: (string | null)[] = new Array(size).fill(null);
  for (let i = 0; i < numPlayers; i++) {
    paddedParticipants[seededSlots[i]] = participants[i].id;
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
