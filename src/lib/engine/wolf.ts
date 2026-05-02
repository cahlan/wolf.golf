import type { Game } from '../types/game';
import { calculateStandings } from './standings';

export function getWolfForHole(game: Game, holeNum: number): number {
  const startHole = game.startingHole ?? 1;
  const lastPlaceStartHole = game.lastPlaceWolfStartHole ?? 17;
  const lastPlaceEnabled = game.lastPlaceWolf ?? true;

  // Last-place wolf: triggered when the round position is >= lastPlaceStartHole.
  // We derive round position from the course hole number.
  // roundPos = ((holeNum - startHole) % 18 + 18) % 18 + 1
  const roundPos = ((holeNum - startHole + 18) % 18) + 1;

  if (lastPlaceEnabled && roundPos >= lastPlaceStartHole) {
    const standings = calculateStandings(game);
    const lastPlace = standings[standings.length - 1];
    return game.players.indexOf(lastPlace.name);
  }

  // Wolf rotation based on round position (not raw hole number) to handle wrap-around correctly
  const rotationIndex = ((roundPos - 1) % 4 + 4) % 4;
  return game.wolfOrder[rotationIndex];
}
