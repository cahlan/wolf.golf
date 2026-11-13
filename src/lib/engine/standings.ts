import type { Game, Standing } from '../types/game';
import { calculateGameHolePoints } from './scoring-utils';

export function calculateStandings(game: Game): Standing[] {
  const totals: Record<string, number> = {};
  // Seed with starting points (carryover) if set, otherwise 0
  game.players.forEach((p) => (totals[p] = game.startingPoints?.[p] ?? 0));

  game.holes.forEach((hole) => {
    const pts = calculateGameHolePoints(game, hole);
    Object.entries(pts).forEach(([p, v]) => (totals[p] += v));
  });

  return game.players
    .map((name) => ({ name, points: totals[name] }))
    .sort((a, b) => b.points - a.points);
}
