import type { Game, SkinsData } from '../types/game';

export function calculateSkins(game: Game): SkinsData {
  const skins: Record<string, number> = {};
  game.players.forEach((p) => (skins[p] = 0));
  let carryover = 0;
  const shouldCarryover = game.skinsCarryover ?? true;

  for (let i = 0; i < game.holes.length; i++) {
    const hole = game.holes[i];
    const netScores = Object.entries(hole.netScores);
    const minScore = Math.min(...netScores.map(([, s]) => s));
    const winners = netScores.filter(([, s]) => s === minScore);

    if (winners.length === 1) {
      skins[winners[0][0]] += 1 + carryover;
      carryover = 0;
    } else {
      // Tie: carry over only if enabled, otherwise the skin is lost
      if (shouldCarryover) {
        carryover += 1;
      }
      // If not carrying over, carryover stays at 0 and the skin is simply lost
    }
  }

  return { skins, carryover };
}
