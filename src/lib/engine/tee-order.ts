import type { Game } from '../types/game';
import { getWolfForHole } from './wolf';

function rotateToStart<T>(arr: T[], startIndex: number): T[] {
  const n = arr.length;
  if (n === 0) return [];
  const i = ((startIndex % n) + n) % n;
  return [...arr.slice(i), ...arr.slice(0, i)];
}

/**
 * Tee order rules (Wolf):
 * - The setup "wolfOrder" defines the *wolf rotation order* (who is wolf on each hole).
 *   Example: wolfOrder = [A,B,C,D] => Hole1 wolf=A, Hole2 wolf=B, ...
 * - The wolf always has the option to wait and hit last on their hole.
 * - Everyone else hits in the same cyclic order as wolfOrder, starting *after* the wolf.
 *
 * Concretely for a given hole:
 *   baseCycle = wolfOrder mapped to player names
 *   wolf = getWolfForHole(game, holeNum)
 *   order = rotate(baseCycle, wolfIndex+1)
 *   order = order without wolf + wolf at the end
 */
export function getTeeOrderForHole(game: Game, holeNum: number): string[] {
  const baseIndices = (game.wolfOrder?.length ? game.wolfOrder : game.players.map((_, i) => i));
  const baseCycle = baseIndices.map(i => game.players[i]);

  const wolfName = game.players[getWolfForHole(game, holeNum)];
  const wolfIndex = baseCycle.indexOf(wolfName);

  const rotated = rotateToStart(baseCycle, (wolfIndex === -1 ? 0 : wolfIndex + 1));
  const nonWolf = rotated.filter(p => p !== wolfName);
  return [...nonWolf, wolfName];
}
