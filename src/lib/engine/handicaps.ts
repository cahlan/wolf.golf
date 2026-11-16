import type { Game } from '../types/game';
import { HOLES_PER_ROUND } from './constants';

export function getPlayerStrokesOnHole(game: Game, playerName: string, holeNum: number): number {
  const holeInfo = game.course.holes[holeNum - 1];
  const strokeIndex = holeInfo.strokeIndex;

  if (!strokeIndex || strokeIndex < 1 || strokeIndex > HOLES_PER_ROUND) return 0;

  const minHC = Math.min(...Object.values(game.handicaps));
  const playerHC = game.handicaps[playerName];
  const diff = playerHC - minHC;

  if (diff <= 0) return 0;

  let strokes = 0;
  if (strokeIndex <= diff) strokes++;
  if (diff > HOLES_PER_ROUND && strokeIndex <= (diff - HOLES_PER_ROUND)) strokes++;

  return strokes;
}

export function getAllStrokesForHole(game: Game, holeNum: number): Record<string, number> {
  const result: Record<string, number> = {};
  game.players.forEach(p => {
    result[p] = getPlayerStrokesOnHole(game, p, holeNum);
  });
  return result;
}

/**
 * Strokes a player receives on a hole from their *full* handicap (not off the low man).
 * Used for "net vs handicap" display only — match scoring uses getPlayerStrokesOnHole.
 * Plus handicaps (negative) give strokes back on the easiest holes.
 */
export function getFullHandicapStrokes(handicap: number, strokeIndex: number): number {
  if (!strokeIndex || strokeIndex < 1 || strokeIndex > HOLES_PER_ROUND) return 0;
  if (handicap < 0) return strokeIndex > HOLES_PER_ROUND + handicap ? -1 : 0;
  const full = Math.floor(handicap / HOLES_PER_ROUND);
  return full + (strokeIndex <= handicap % HOLES_PER_ROUND ? 1 : 0);
}

export interface HandicapNet {
  holesPlayed: number;
  gross: number;
  net: number;
  par: number;   // par of the holes played
  toPar: number; // net - par
}

/** Per-player gross and full-handicap net over the holes played so far. */
export function calculateHandicapNet(game: Game): Record<string, HandicapNet> {
  const result: Record<string, HandicapNet> = {};
  game.players.forEach(p => {
    let holesPlayed = 0, gross = 0, strokes = 0, par = 0;
    game.holes.forEach(h => {
      const g = h.grossScores[p];
      if (typeof g !== 'number') return;
      holesPlayed++;
      gross += g;
      par += h.par;
      strokes += getFullHandicapStrokes(game.handicaps[p] ?? 0, game.course.holes[h.holeNum - 1]?.strokeIndex);
    });
    const net = gross - strokes;
    result[p] = { holesPlayed, gross, net, par, toPar: net - par };
  });
  return result;
}
