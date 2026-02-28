import type { Game, CompletedHole } from '../types/game';
import { calculateHolePoints } from './scoring';
import { calculateSixHolePoints, getTeamsForHole } from './six';
import { calculateThreeTwoOneHolePoints } from './three-two-one';

/**
 * Game-type-aware hole points dispatcher.
 * For wolf games: delegates to calculateHolePoints.
 * For 6x6x6 games: delegates to calculateSixHolePoints with the correct teams.
 * For 3-2-1 games: delegates to calculateThreeTwoOneHolePoints.
 */
export function calculateGameHolePoints(
  game: Game,
  hole: CompletedHole
): Record<string, number> {
  const type = game.gameType ?? 'wolf';
  if (type === 'six') {
    const { teamA, teamB } = getTeamsForHole(game, hole.holeNum);
    return calculateSixHolePoints(hole, teamA, teamB);
  }
  if (type === 'three-two-one') {
    return calculateThreeTwoOneHolePoints(hole);
  }
  return calculateHolePoints(hole);
}
