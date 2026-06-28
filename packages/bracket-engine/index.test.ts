import { describe, it, expect } from "bun:test";
import {
  generateSingleElimination,
  generateRoundRobin,
} from "./index";
import { Participant } from "./types";

describe("Bracket Engine Tests", () => {
  const participants: Participant[] = [
    { id: "p1", name: "Player 1" },
    { id: "p2", name: "Player 2" },
    { id: "p3", name: "Player 3" },
    { id: "p4", name: "Player 4" },
    { id: "p5", name: "Player 5" },
    { id: "p6", name: "Player 6" },
    { id: "p7", name: "Player 7" },
    { id: "p8", name: "Player 8" },
  ];

  it("should generate Single Elimination bracket", () => {
    const matches = generateSingleElimination(participants);
    expect(matches.length).toBe(7);

    const round1 = matches.filter((m) => m.round === 1);
    const round2 = matches.filter((m) => m.round === 2);
    const round3 = matches.filter((m) => m.round === 3);

    expect(round1.length).toBe(4);
    expect(round2.length).toBe(2);
    expect(round3.length).toBe(1);

    // All R1 matches have real players (8 = power of 2, no byes)
    const r1WithBothPlayers = round1.filter(
      (m) => m.participant1Id && m.participant2Id
    );
    expect(r1WithBothPlayers.length).toBe(4);

    // All R1 matches point to a next match
    for (const m of round1) {
      expect(m.nextMatchIndex).not.toBeNull();
    }
  });

  it("should auto-advance BYE players when participant count is not a power of two", () => {
    // 3 игрока: size=4, R1 = 2 матча.
    // Standard seeding: slot order [0,3,1,2] → p1→slot0, p2→slot3, p3→slot1, bye→slot2.
    // Пары: (slot0,slot1)=p1 vs p3 (реальный матч), (slot2,slot3)=null vs p2 (bye → p2).
    const three: Participant[] = [
      { id: "p1", name: "P1" },
      { id: "p2", name: "P2" },
      { id: "p3", name: "P3" },
    ];
    const matches = generateSingleElimination(three);

    // Ровно один bye-матч; по стандартной рассадке bye достаётся 2-му сеянному (p2)
    const byeMatches = matches.filter((m) => m.winnerParticipantId);
    expect(byeMatches.length).toBe(1);
    expect(byeMatches[0].winnerParticipantId).toBe("p2");

    // Победитель bye уже вставлен в финал (round 2) как один из участников
    const final = matches.find((m) => m.round === 2)!;
    const finalSlots = [final.participant1Id, final.participant2Id];
    expect(finalSlots).toContain("p2");

    // Финал НЕ должен быть авто-разрешён: один слот ждёт победителя p1 vs p3
    expect(final.winnerParticipantId).toBeFalsy();

    // Нет dead-матчей в R1 (оба слота пусты и нет winner)
    const deadR1 = matches.filter(
      (m) => m.round === 1 && !m.participant1Id && !m.participant2Id && !m.winnerParticipantId
    );
    expect(deadR1.length).toBe(0);
  });

  it("should not create dead matches with 6 players", () => {
    // Это был основной баг: 6 игроков → size=8, sequential placement давал
    // последнюю пару R1 как (null, null) — dead match, из-за которого турнир
    // не мог продвинуться дальше 2-го этапа.
    const six: Participant[] = [
      { id: "p1", name: "P1" },
      { id: "p2", name: "P2" },
      { id: "p3", name: "P3" },
      { id: "p4", name: "P4" },
      { id: "p5", name: "P5" },
      { id: "p6", name: "P6" },
    ];
    const matches = generateSingleElimination(six);

    expect(matches.length).toBe(7);

    // Нет dead-матчей в R1
    const deadR1 = matches.filter(
      (m) => m.round === 1 && !m.participant1Id && !m.participant2Id && !m.winnerParticipantId
    );
    expect(deadR1.length).toBe(0);

    // Ровно 2 bye в R1 (8 - 6 = 2 пустых слота)
    const byesR1 = matches.filter((m) => m.round === 1 && m.winnerParticipantId);
    expect(byesR1.length).toBe(2);

    // Ровно 2 реальных матча в R1
    const realR1 = matches.filter(
      (m) => m.round === 1 && m.participant1Id && m.participant2Id
    );
    expect(realR1.length).toBe(2);

    // R2 должен иметь 2 предзаполненных участника (bye-победители)
    const r2 = matches.filter((m) => m.round === 2);
    const r2prefilled = r2
      .flatMap((m) => [m.participant1Id, m.participant2Id])
      .filter(Boolean);
    expect(r2prefilled.length).toBe(2);
  });

  it("should not hang with 5 players (distributed byes)", () => {
    // 5 игроков → size=8, нужно 3 bye.
    // Standard seeding: [a,b,c,d,e] → a→0, b→7, c→3, d→4, e→1; byes на 2,5,6.
    // Пары R1: (a,e)=реальный, (null,c)=bye→c, (d,null)=bye→d, (null,b)=bye→b.
    const five: Participant[] = [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
      { id: "d", name: "D" },
      { id: "e", name: "E" },
    ];
    const matches = generateSingleElimination(five);

    // Нет dead-матчей в R1
    const deadR1 = matches.filter(
      (m) => m.round === 1 && !m.participant1Id && !m.participant2Id && !m.winnerParticipantId
    );
    expect(deadR1.length).toBe(0);

    // Ровно 1 реальный матч в R1, 3 bye
    const playableR1 = matches.filter(
      (m) => m.round === 1 && m.participant1Id && m.participant2Id
    );
    expect(playableR1.length).toBe(1);

    const byeR1 = matches.filter((m) => m.round === 1 && m.winnerParticipantId);
    expect(byeR1.length).toBe(3);

    // b, c, d должны появиться в R2 (они получили bye)
    const r2 = matches.filter((m) => m.round === 2);
    const r2prefilled = r2.flatMap((m) => [m.participant1Id, m.participant2Id]).filter(Boolean);
    expect(r2prefilled).toContain("b");
    expect(r2prefilled).toContain("c");
    expect(r2prefilled).toContain("d");
  });

  it("should generate Round Robin matches", () => {
    const matches = generateRoundRobin(participants);
    // For 8 players, total rounds = 7, each round has 4 matches -> 28 matches.
    expect(matches.length).toBe(28);

    const rounds = new Set(matches.map((m) => m.round));
    expect(rounds.size).toBe(7);
  });
});
