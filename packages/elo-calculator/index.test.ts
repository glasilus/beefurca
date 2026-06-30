import { describe, it, expect } from "bun:test";
import {
  calculateEloChange,
  calculateTeamEloChange,
  getKFactor,
  getExpectedScore,
} from "./index";

describe("ELO Calculator Tests", () => {
  it("should calculate expected scores correctly", () => {
    // равные рейтинги дают ожидание 0.5
    expect(getExpectedScore(1000, 1000)).toBeCloseTo(0.5, 4);

    // более высокий рейтинг - большее ожидание
    expect(getExpectedScore(1200, 1000)).toBeGreaterThan(0.5);
    expect(getExpectedScore(800, 1000)).toBeLessThan(0.5);
  });

  it("should calculate correct single ELO changes for a win", () => {
    const ratingA = 1000;
    const ratingB = 1000;
    
    // побеждает игрок A
    const result = calculateEloChange(ratingA, ratingB, 1, 0, 32);

    expect(result.deltaA).toBe(16);
    expect(result.deltaB).toBe(-16);
    expect(result.newRatingA).toBe(1016);
    expect(result.newRatingB).toBe(984);
  });

  it("should calculate correct team ELO changes", () => {
    const teamA = [1000, 1100, 1050]; // Avg ELO = 1050
    const teamB = [950, 1000, 900];   // Avg ELO = 950

    // побеждает команда A
    const result = calculateTeamEloChange(teamA, teamB, 1, 0, 32);

    // у команды A средний ELO выше, поэтому её ожидание больше,
    // значит дельта A положительна, но меньше 16 (как для равного матча)
    expect(result.deltaA).toBeGreaterThan(0);
    expect(result.deltaA).toBeLessThan(16);
    expect(result.deltaB).toBeLessThan(0);
    
    // проверяем новый ELO участников
    expect(result.newRatingsA[0]).toBe(teamA[0] + result.deltaA);
    expect(result.newRatingsB[0]).toBe(teamB[0] + result.deltaB);
  });

  it("should determine correct K-Factor", () => {
    expect(getKFactor("STANDARD")).toBe(32);
    expect(getKFactor("SANDBOX")).toBe(0);
  });
});
