import { Participant, GeneratedMatch } from "./types";

/**
 * Стандартный посев турнирной сетки.
 * Возвращает индексы слотов в порядке приоритета посева (1-й, 2-й, 3-й, ...).
 * Размещение игроков по этим слотам равномерно распределяет проходы без игры:
 * два пустых слота не попадают в одну пару первого раунда, мёртвых матчей не возникает.
 *
 * Примеры (индексация с нуля):
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
 * Возвращает ближайшую степень двойки, большую или равную n.
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
        // «Мёртвый» матч: участники не придут никогда - снимаем питатель.
        resolved.add(i);
        if (m.nextMatchIndex != null) removeFeeder(m.nextMatchIndex, m.nextMatchIsP1);
        changed = true;
      }
    }
  }
}

/**
 * Генерирует сетку олимпийской системы (на вылет).
 * Если число участников не степень двойки, добавляет проходы без игры (null).
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

  // строим сетку от финала к первому раунду - так проще проставить связи
  // всего раундов: log2(size)
  const totalRounds = Math.log2(size);

  // массив матчей строим в обратном порядке (финал - индекс 0),
  // это упрощает вычисление nextMatchIndex
  // в раунде R содержится 2^(totalRounds - R) матчей
  
  // матч с индексом i имеет дочерний матч с индексом floor((i-1)/2):
  // нечётный i ведёт в participant1 (nextMatchIsP1 = true), чётный - в participant2
  
  // всего матчей в полном дереве размера S: S - 1
  const totalMatchesCount = size - 1;
  
  // инициализация заготовок матчей
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

  // заполняем раунд, позицию и связи nextMatch
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

  // заполняем участников первого раунда
  const firstRoundStartIndex = totalMatchesCount - (size / 2);

  // раскладываем игроков по слотам стандартным посевом:
  // проходы без игры (null) попадают на оставшиеся слоты, всегда разделённые
  // хотя бы одним игроком, поэтому пары (null, null) не возникает
  const seededSlots = standardSeeding(size);
  const paddedParticipants: (string | null)[] = new Array(size).fill(null);
  for (let i = 0; i < numPlayers; i++) {
    paddedParticipants[seededSlots[i]] = participants[i].id;
  }

  // распределяем игроков по матчам первого раунда
  for (let i = 0; i < size / 2; i++) {
    const idx = firstRoundStartIndex + i;
    matches[idx].participant1Id = paddedParticipants[2 * i];
    matches[idx].participant2Id = paddedParticipants[2 * i + 1];
  }

  // возвращаем матчи в хронологическом порядке (раунд 1, затем раунд 2, ...)
  const result = matches.reverse().map((m) => {
    // корректируем nextMatchIndex, так как массив был развёрнут
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
 * Генерирует структуру турнира по круговой системе (каждый с каждым).
 * Стандартный метод «карусели».
 */
export function generateRoundRobin(
  participants: Participant[]
): GeneratedMatch[] {
  const numPlayers = participants.length;
  if (numPlayers < 2) return [];

  // при нечётном числе добавляем фиктивного игрока (BYE)
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

      // пропускаем матч, если один из участников - BYE
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

    // сдвигаем список по кругу (первый элемент фиксирован)
    const last = list[n - 1];
    for (let k = n - 1; k > 1; k--) {
      list[k] = list[k - 1];
    }
    list[1] = last;
  }

  return matches;
}
