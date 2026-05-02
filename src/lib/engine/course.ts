import type { Course, HoleInfo } from '../types/game';

export function createCourse(name: string, holes: HoleInfo[]): Course {
  return { name, holes };
}

/**
 * Convert a round-position (1-based, 1 = first hole played) to a course hole
 * number (1–18), wrapping around after hole 18.
 *
 * e.g. startingHole=14:
 *   roundPos=1  → 14
 *   roundPos=5  → 18
 *   roundPos=6  → 1
 *   roundPos=18 → 13
 */
export function courseHoleForRoundPos(startingHole: number, roundPos: number): number {
  return ((startingHole - 1 + roundPos - 1) % 18) + 1;
}

/**
 * How many holes remain in the round, given how many have been played.
 */
export function holesRemainingInRound(totalPlayed: number): number {
  return 18 - totalPlayed;
}
