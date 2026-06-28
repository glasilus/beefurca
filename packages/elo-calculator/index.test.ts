import { describe, it, expect } from "bun:test";
import {
  calculateEloChange,
  calculateTeamEloChange,
  getKFactor,
  getExpectedScore,
} from "./index";

describe("ELO Calculator Tests", () => {
  it("should calculate expected scores correctly", () => {
    // Equal ratings should give 0.5 expected score
    expect(getExpectedScore(1000, 1000)).toBeCloseTo(0.5, 4);

    // Higher rating should have higher expected score
    expect(getExpectedScore(1200, 1000)).toBeGreaterThan(0.5);
    expect(getExpectedScore(800, 1000)).toBeLessThan(0.5);
  });

  it("should calculate correct single ELO changes for a win", () => {
    const ratingA = 1000;
    const ratingB = 1000;
    
    // Player A wins
    const result = calculateEloChange(ratingA, ratingB, 1, 0, 32);

    expect(result.deltaA).toBe(16);
    expect(result.deltaB).toBe(-16);
    expect(result.newRatingA).toBe(1016);
    expect(result.newRatingB).toBe(984);
  });

  it("should calculate correct team ELO changes", () => {
    const teamA = [1000, 1100, 1050]; // Avg ELO = 1050
    const teamB = [950, 1000, 900];   // Avg ELO = 950

    // Team A wins
    const result = calculateTeamEloChange(teamA, teamB, 1, 0, 32);

    // Since Team A had higher avg ELO, their expected score was higher,
    // so delta A should be positive but less than 16 (for equal match).
    expect(result.deltaA).toBeGreaterThan(0);
    expect(result.deltaA).toBeLessThan(16);
    expect(result.deltaB).toBeLessThan(0);
    
    // Check members new ELO
    expect(result.newRatingsA[0]).toBe(teamA[0] + result.deltaA);
    expect(result.newRatingsB[0]).toBe(teamB[0] + result.deltaB);
  });

  it("should determine correct K-Factor", () => {
    expect(getKFactor("STANDARD")).toBe(32);
    expect(getKFactor("SANDBOX")).toBe(0);
  });
});
