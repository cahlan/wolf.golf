import type { LoneWolfType } from '../types/game';

/**
 * Points awarded to the wolf per lone-wolf declaration type.
 * 'early'  — declared before anyone tees off (+4)
 * 'late'   — declared after others hit, before wolf tees (+3)
 * 'default'— wolf didn't pick a partner (+2)
 */
export const LONE_WOLF_POINTS: Record<LoneWolfType, number> = {
  early: 4,
  late: 3,
  default: 2,
};

/**
 * Weekend leaderboard points awarded by finish position (0-indexed).
 * 1st → 4 pts, 2nd → 3 pts, 3rd → 2 pts, 4th → 1 pt.
 * Any placement beyond index 3 receives 0 points.
 */
export const WEEKEND_PLACEMENT_POINTS = [4, 3, 2, 1] as const;
