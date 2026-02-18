import type { Game, Standing } from '../types/game';
import { calculateHolePoints } from './scoring';

export function calculateStandings(game: Game): Standing[] {
  const totals: Record<string, number> = {};
  game.players.forEach((p) => (totals[p] = 0));

  game.holes.forEach((hole) => {
    const pts = calculateHolePoints(hole);
    Object.entries(pts).forEach(([p, v]) => (totals[p] += v));
  });

  return game.players
    .map((name) => ({ name, points: totals[name] }))
    .sort((a, b) => b.points - a.points);
}
