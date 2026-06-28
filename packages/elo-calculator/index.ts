/**
 * Basic ELO expectation calculation.
 */
export function getExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculates ELO change for single participants.
 * scoreA, scoreB: actual scores (e.g., 1 for win, 0 for loss, 0.5 for draw)
 * kFactor: ELO coefficient (standard is 32)
 */
export function calculateEloChange(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  scoreB: number,
  kFactor: number = 32
): { deltaA: number; deltaB: number; newRatingA: number; newRatingB: number } {
  const expectedA = getExpectedScore(ratingA, ratingB);
  const expectedB = getExpectedScore(ratingB, ratingA);

  let actualA = 0.5;
  let actualB = 0.5;

  if (scoreA > scoreB) {
    actualA = 1;
    actualB = 0;
  } else if (scoreB > scoreA) {
    actualA = 0;
    actualB = 1;
  }

  // Calculate delta and round to nearest integer
  const deltaA = Math.round(kFactor * (actualA - expectedA));
  const deltaB = Math.round(kFactor * (actualB - expectedB));

  return {
    deltaA,
    deltaB,
    newRatingA: Math.max(100, ratingA + deltaA), // ELO cannot go below 100
    newRatingB: Math.max(100, ratingB + deltaB),
  };
}

/**
 * Calculates ELO changes for team members.
 * Computes average ELO for both teams, calculates team delta, and returns individual ELO deltas.
 */
export function calculateTeamEloChange(
  teamARatings: number[],
  teamBRatings: number[],
  scoreA: number,
  scoreB: number,
  kFactor: number = 32
): {
  deltaA: number; // Delta to apply to each member of Team A
  deltaB: number; // Delta to apply to each member of Team B
  newRatingsA: number[];
  newRatingsB: number[];
} {
  const avgRatingA =
    teamARatings.length > 0
      ? teamARatings.reduce((sum, r) => sum + r, 0) / teamARatings.length
      : 1000;
  const avgRatingB =
    teamBRatings.length > 0
      ? teamBRatings.reduce((sum, r) => sum + r, 0) / teamBRatings.length
      : 1000;

  const expectedA = getExpectedScore(avgRatingA, avgRatingB);
  const expectedB = getExpectedScore(avgRatingB, avgRatingA);

  let actualA = 0.5;
  let actualB = 0.5;

  if (scoreA > scoreB) {
    actualA = 1;
    actualB = 0;
  } else if (scoreB > scoreA) {
    actualA = 0;
    actualB = 1;
  }

  const deltaA = Math.round(kFactor * (actualA - expectedA));
  const deltaB = Math.round(kFactor * (actualB - expectedB));

  return {
    deltaA,
    deltaB,
    newRatingsA: teamARatings.map((r) => Math.max(100, r + deltaA)),
    newRatingsB: teamBRatings.map((r) => Math.max(100, r + deltaB)),
  };
}

/**
 * Returns the K-Factor based on tournament mode.
 * - STANDARD: 32 (рейтинг пересчитывается)
 * - SANDBOX: 0 (автономный учёт, ELO не затрагивается)
 */
export function getKFactor(tournamentType: "STANDARD" | "SANDBOX"): number {
  return tournamentType === "STANDARD" ? 32 : 0;
}
