import { describe, it, expect } from "bun:test";
import {
  generateSingleElimination,
  generateDoubleElimination,
  generateRoundRobin,
  generateSwissRound1,
  generateNextSwissRound,
  calculateBuchholz,
} from "./index";
import { Participant, SwissRoundPlayer } from "./types";

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
    // For 8 players, total matches should be 7.
    expect(matches.length).toBe(7);

    // Verify round structures
    const round1 = matches.filter((m) => m.round === 1);
    const round2 = matches.filter((m) => m.round === 2);
    const round3 = matches.filter((m) => m.round === 3);

    expect(round1.length).toBe(4);
    expect(round2.length).toBe(2);
    expect(round3.length).toBe(1);

    // Check connections
    expect(round1[0].nextMatchIndex).not.toBeNull();
  });

  it("should generate Double Elimination bracket", () => {
    const matches = generateDoubleElimination(participants);
    
    // For 8 players:
    // Winners: 7 matches (R1: 4, R2: 2, R3: 1)
    // Losers: 6 matches (LR1: 2, LR2: 2, LR3: 1, LR4: 1)
    // Grand Final: 1 match
    // Reset: 1 match
    // Total matches: 15
    expect(matches.length).toBe(15);

    const winners = matches.filter((m) => m.type === "winners");
    const losers = matches.filter((m) => m.type === "losers");
    const gf = matches.filter((m) => m.type === "grand_final");
    const reset = matches.filter((m) => m.type === "grand_final_reset");

    expect(winners.length).toBe(7);
    expect(losers.length).toBe(6);
    expect(gf.length).toBe(1);
    expect(reset.length).toBe(1);
  });

  it("should auto-advance BYE players when participant count is not a power of two", () => {
    // 3 игрока: size=4, R1 = 2 матча. Один матч p1-vs-p2, второй — p3 c BYE.
    const three: Participant[] = [
      { id: "p1", name: "P1" },
      { id: "p2", name: "P2" },
      { id: "p3", name: "P3" },
    ];
    const matches = generateSingleElimination(three);

    // Должен существовать ровно один bye-матч с автопобедителем p3
    const byeMatches = matches.filter((m) => m.winnerParticipantId);
    expect(byeMatches.length).toBe(1);
    expect(byeMatches[0].winnerParticipantId).toBe("p3");

    // Победитель bye должен быть протянут в финал (round 2)
    const final = matches.find((m) => m.round === 2)!;
    const finalSlots = [final.participant1Id, final.participant2Id];
    expect(finalSlots).toContain("p3");

    // Финал НЕ должен быть авто-разрешён: второй слот ждёт победителя матча p1-vs-p2
    expect(final.winnerParticipantId).toBeFalsy();
  });

  it("should not hang with 5 players (cascading byes)", () => {
    const five: Participant[] = [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
      { id: "d", name: "D" },
      { id: "e", name: "E" },
    ];
    const matches = generateSingleElimination(five);
    // size=8: реальные R1-матчи — [a,b] и [c,d]; e получает bye и проходит сквозь
    // пустую половину сетки (каскад байов), не зависая.
    const playableR1 = matches.filter(
      (m) => m.round === 1 && m.participant1Id && m.participant2Id
    );
    expect(playableR1.length).toBe(2);

    // e должен автоматически продвинуться (хотя бы одна bye-победа)
    const eByeWins = matches.filter((m) => m.winnerParticipantId === "e");
    expect(eByeWins.length).toBeGreaterThanOrEqual(1);

    // e попадает во второй раунд без игры
    const r2 = matches.filter((m) => m.round === 2);
    const r2filled = r2.flatMap((m) => [m.participant1Id, m.participant2Id]).filter(Boolean);
    expect(r2filled).toContain("e");
  });

  it("should generate Round Robin matches", () => {
    const matches = generateRoundRobin(participants);
    // For 8 players, total rounds = 7, each round has 4 matches -> 28 matches.
    expect(matches.length).toBe(28);

    // Verify round distribution
    const rounds = new Set(matches.map((m) => m.round));
    expect(rounds.size).toBe(7);
  });

  it("should generate Swiss Round 1 and pair next round with history", () => {
    const r1Matches = generateSwissRound1(participants);
    expect(r1Matches.length).toBe(4);

    // Create history data for next round pairing
    // E.g. p1, p2, p3, p4 won their matches.
    const players: SwissRoundPlayer[] = [
      { id: "p1", points: 1, opponents: ["p5"], buchholz: 0 },
      { id: "p2", points: 1, opponents: ["p6"], buchholz: 0 },
      { id: "p3", points: 1, opponents: ["p7"], buchholz: 0 },
      { id: "p4", points: 1, opponents: ["p8"], buchholz: 0 },
      { id: "p5", points: 0, opponents: ["p1"], buchholz: 0 },
      { id: "p6", points: 0, opponents: ["p2"], buchholz: 0 },
      { id: "p7", points: 0, opponents: ["p3"], buchholz: 0 },
      { id: "p8", points: 0, opponents: ["p4"], buchholz: 0 },
    ];

    const updatedPlayers = calculateBuchholz(players);
    // Verify Buchholz: p1 played p5 (0 points), so p1's Buchholz = 0.
    // Let's modify scores to check Buchholz summation
    players[0].opponents = ["p2"]; // p1 played p2 (who has 1 point)
    const recalculated = calculateBuchholz(players);
    expect(recalculated[0].buchholz).toBe(1);

    const r2Matches = generateNextSwissRound(recalculated, 2);
    expect(r2Matches.length).toBe(4);
    
    // Verify no duplicates
    for (const match of r2Matches) {
      expect(match.participant1Id).not.toBe(match.participant2Id);
    }
  });
});
