import type { LoneWolfType } from '../types/game';

/** A standard round is 18 holes. Used for round-position wrap-around and completion. */
export const HOLES_PER_ROUND = 18;

/** 6x6x6 splits the round into three equal segments of this many holes. */
export const HOLES_PER_SEGMENT = 6;

/** All game types assume a foursome. Drives wolf rotation and team assignment. */
export const PLAYERS_PER_GAME = 4;

/** Default first hole played when a game doesn't specify a wrap-around start. */
export const DEFAULT_STARTING_HOLE = 1;

/** Round position at which the trailing player becomes wolf, unless overridden. */
export const DEFAULT_LAST_PLACE_WOLF_START_HOLE = 17;

/**
 * Points awarded to the wolf for a winning lone-wolf hole.
 * - early: declared before anyone tees off (+4)
 * - late: declared after others hit, before wolf tees (+3)
 * - default: no partner was picked (+2)
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
