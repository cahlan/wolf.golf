import type { Game, Standing } from '../types/game';
import { calculateStandings } from './standings';

export function calculateWeekendStandings(games: Game[]): Standing[] {
  const weekendPoints: Record<string, number> = {};

  games.forEach(game => {
    const standings = calculateStandings(game);
    standings.forEach((s, i) => {
      if (!weekendPoints[s.name]) weekendPoints[s.name] = 0;
      weekendPoints[s.name] += [4, 3, 2, 1][i] || 0;
    });
  });

  return Object.entries(weekendPoints)
    .map(([name, points]) => ({ name, points }))
    .sort((a, b) => b.points - a.points);
}
