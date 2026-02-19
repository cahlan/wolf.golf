import type { Game, Settlement, DebtTransfer } from '../types/game';
import { calculateStandings } from './standings';
import { calculateSkins } from './skins';

export function calculateSettlement(game: Game): Settlement {
  const standings = calculateStandings(game);
  const { skins } = calculateSkins(game);
  const totalSkins = Object.values(skins).reduce((a, b) => a + b, 0);

  const wolfNet: Record<string, number> = {};
  const structure = game.payoutStructure ?? 'winner-takes-all';
  standings.forEach((s, i) => {
    switch (structure) {
      case 'top-two-split':
        // 1st: +1.5×buyIn, 2nd: +0.5×buyIn, 3rd: -buyIn, 4th: -buyIn  (sum = 0)
        if (i === 0) wolfNet[s.name] = game.buyIn * 1.5;
        else if (i === 1) wolfNet[s.name] = game.buyIn * 0.5;
        else wolfNet[s.name] = -game.buyIn;
        break;
      case 'top-three-split':
        // 1st: +1×buyIn, 2nd: +0.5×buyIn, 3rd: +0.5×buyIn, 4th: -2×buyIn  (sum = 0)
        if (i === 0) wolfNet[s.name] = game.buyIn;
        else if (i === 1) wolfNet[s.name] = game.buyIn * 0.5;
        else if (i === 2) wolfNet[s.name] = game.buyIn * 0.5;
        else wolfNet[s.name] = -game.buyIn * 2;
        break;
      default: // 'winner-takes-all'
        if (i === 0) wolfNet[s.name] = game.buyIn * 2;
        else if (i === 1) wolfNet[s.name] = 0;
        else wolfNet[s.name] = -game.buyIn;
        break;
    }
  });

  const skinsNet: Record<string, number> = {};
  game.players.forEach((p) => {
    skinsNet[p] = totalSkins > 0
      ? (skins[p] - totalSkins / 4) * (game.skinsValue || 0)
      : 0;
  });

  const totalNet: Record<string, number> = {};
  game.players.forEach((p) => {
    totalNet[p] = (wolfNet[p] || 0) + (skinsNet[p] || 0);
  });

  const transfers = simplifyDebts(totalNet);

  return { standings, wolfNet, skinsNet, skins, totalNet, transfers };
}

export function simplifyDebts(netAmounts: Record<string, number>): DebtTransfer[] {
  const debtors: { name: string; amount: number }[] = [];
  const creditors: { name: string; amount: number }[] = [];

  Object.entries(netAmounts).forEach(([name, amount]) => {
    if (amount < -0.01) debtors.push({ name, amount: -amount });
    else if (amount > 0.01) creditors.push({ name, amount });
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: DebtTransfer[] = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const payment = Math.min(debtors[i].amount, creditors[j].amount);
    if (payment > 0.01) {
      transfers.push({
        from: debtors[i].name,
        to: creditors[j].name,
        amount: Math.round(payment * 100) / 100,
      });
    }
    debtors[i].amount -= payment;
    creditors[j].amount -= payment;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return transfers;
}
