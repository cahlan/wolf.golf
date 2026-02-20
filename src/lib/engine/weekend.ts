import type { Game, Standing } from '../types/game';
import { calculateStandings } from './standings';
import { WEEKEND_PLACEMENT_POINTS } from './constants';

export function calculateWeekendStandings(games: Game[]): Standing[] {
  const weekendPoints: Record<string, number> = {};

  games.forEach(game => {
    const standings = calculateStandings(game);
    standings.forEach((s, i) => {
      if (!weekendPoints[s.name]) weekendPoints[s.name] = 0;
      weekendPoints[s.name] += WEEKEND_PLACEMENT_POINTS[i] ?? 0;
    });
  });

  return Object.entries(weekendPoints)
    .map(([name, points]) => ({ name, points }))
    .sort((a, b) => b.points - a.points);
}
