import type { Game } from '../types/game';
import { calculateStandings } from './standings';

export function getWolfForHole(game: Game, holeNum: number): number {
  if (holeNum >= 17) {
    const standings = calculateStandings(game);
    const lastPlace = standings[standings.length - 1];
    return game.players.indexOf(lastPlace.name);
  }
  const rotationIndex = (holeNum - 1) % 4;
  return game.wolfOrder[rotationIndex];
}
