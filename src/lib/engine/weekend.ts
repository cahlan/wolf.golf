import type { Game, Standing } from '../types/game';
import { calculateStandings } from './standings';
import { WEEKEND_PLACEMENT_POINTS } from './constants';

function getWeekendPlacementIndex(game: Game, playerName: string, computedIndex: number): number {
  const placement = game.weekendPlacementOverride?.[playerName];
  if (typeof placement === 'number' && placement >= 1) return placement - 1;
  return computedIndex;
}

export function calculateWeekendStandings(games: Game[]): Standing[] {
  const weekendPoints: Record<string, number> = {};

  games.forEach(game => {
    const standings = calculateStandings(game);
    standings.forEach((s, computedIndex) => {
      const placementIndex = getWeekendPlacementIndex(game, s.name, computedIndex);
      if (!weekendPoints[s.name]) weekendPoints[s.name] = 0;
      weekendPoints[s.name] += WEEKEND_PLACEMENT_POINTS[placementIndex] ?? 0;
    });
  });

  return Object.entries(weekendPoints)
    .map(([name, points]) => ({ name, points }))
    .sort((a, b) => b.points - a.points);
}
