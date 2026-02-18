import type { Game, SkinsData } from '../types/game';

export function calculateSkins(game: Game): SkinsData {
  const skins: Record<string, number> = {};
  game.players.forEach((p) => (skins[p] = 0));
  let carryover = 0;

  for (let i = 0; i < game.holes.length; i++) {
    const hole = game.holes[i];
    const netScores = Object.entries(hole.netScores);
    const minScore = Math.min(...netScores.map(([, s]) => s));
    const winners = netScores.filter(([, s]) => s === minScore);

    if (winners.length === 1) {
      skins[winners[0][0]] += 1 + carryover;
      carryover = 0;
    } else {
      carryover += 1;
    }
  }

  return { skins, carryover };
}
