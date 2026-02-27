import type { Game, CompletedHole } from '../types/game';
import { calculateHolePoints } from './scoring';
import { calculateSixHolePoints, getTeamsForHole } from './six';

/**
 * Game-type-aware hole points dispatcher.
 * For wolf games: delegates to calculateHolePoints.
 * For 6x6x6 games: delegates to calculateSixHolePoints with the correct teams.
 */
export function calculateGameHolePoints(
  game: Game,
  hole: CompletedHole
): Record<string, number> {
  if ((game.gameType ?? 'wolf') === 'six') {
    const { teamA, teamB } = getTeamsForHole(game, hole.holeNum);
    return calculateSixHolePoints(hole, teamA, teamB);
  }
  return calculateHolePoints(hole);
}
