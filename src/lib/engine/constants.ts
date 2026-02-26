import type { LoneWolfType } from '../types/game';

/**
 * Points awarded to the wolf for a winning lone wolf hole.
 * - early: declared before any drives (+4)
 * - late: declared after other drives but before wolf's drive (+3)
 * - default: no partner was picked (+2)
 */
export const LONE_WOLF_POINTS: Record<LoneWolfType, number> = {
  early: 4,
  late: 3,
  default: 2,
};
