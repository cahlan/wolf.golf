import type { Game } from '../types/game';

export function getPlayerStrokesOnHole(game: Game, playerName: string, holeNum: number): number {
  const holeInfo = game.course.holes[holeNum - 1];
  const strokeIndex = holeInfo.strokeIndex;

  if (!strokeIndex || strokeIndex < 1 || strokeIndex > 18) return 0;

  const minHC = Math.min(...Object.values(game.handicaps));
  const playerHC = game.handicaps[playerName];
  const diff = playerHC - minHC;

  if (diff <= 0) return 0;

  let strokes = 0;
  if (strokeIndex <= diff) strokes++;
  if (diff > 18 && strokeIndex <= (diff - 18)) strokes++;

  return strokes;
}

export function getAllStrokesForHole(game: Game, holeNum: number): Record<string, number> {
  const result: Record<string, number> = {};
  game.players.forEach(p => {
    result[p] = getPlayerStrokesOnHole(game, p, holeNum);
  });
  return result;
}
