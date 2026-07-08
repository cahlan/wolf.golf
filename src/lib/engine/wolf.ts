import type { Game } from '../types/game';
import { calculateStandings } from './standings';
import {
  HOLES_PER_ROUND,
  PLAYERS_PER_GAME,
  DEFAULT_STARTING_HOLE,
  DEFAULT_LAST_PLACE_WOLF_START_HOLE,
} from './constants';

export function getWolfForHole(game: Game, holeNum: number): number {
  const startHole = game.startingHole ?? DEFAULT_STARTING_HOLE;
  const lastPlaceStartHole = game.lastPlaceWolfStartHole ?? DEFAULT_LAST_PLACE_WOLF_START_HOLE;
  const lastPlaceEnabled = game.lastPlaceWolf ?? true;

  // Last-place wolf: triggered when the round position is >= lastPlaceStartHole.
  // We derive round position from the course hole number.
  const roundPos = ((holeNum - startHole + HOLES_PER_ROUND) % HOLES_PER_ROUND) + 1;

  if (lastPlaceEnabled && roundPos >= lastPlaceStartHole) {
    const standings = calculateStandings(game);
    const lastPlace = standings[standings.length - 1];
    return game.players.indexOf(lastPlace.name);
  }

  // Wolf rotation based on round position (not raw hole number) to handle wrap-around correctly
  const rotationIndex = ((roundPos - 1) % PLAYERS_PER_GAME + PLAYERS_PER_GAME) % PLAYERS_PER_GAME;
  return game.wolfOrder[rotationIndex];
}
