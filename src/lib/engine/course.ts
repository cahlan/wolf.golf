import type { Course, HoleInfo } from '../types/game';
import { HOLES_PER_ROUND } from './constants';

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
  return ((startingHole - 1 + roundPos - 1) % HOLES_PER_ROUND) + 1;
}
