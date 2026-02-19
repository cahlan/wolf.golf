import type { CompletedHole, HoleMatchupDetail } from '../types/game';
import { LONE_WOLF_POINTS } from './constants';

export function getHoleMatchupDetail(hole: CompletedHole): HoleMatchupDetail {
  if (hole.loneWolf !== null) {
    const wolfName = hole.wolf;
    const others = hole.players.filter(p => p !== wolfName);
    const wolfScore = hole.netScores[wolfName];
    const bestOther = Math.min(...others.map(p => hole.netScores[p]));
    const bestOtherName = others.find(p => hole.netScores[p] === bestOther)!;
    if (wolfScore < bestOther) {
      const pts = LONE_WOLF_POINTS[hole.loneWolf!];
      return {
        type: 'lone',
        lines: [{ label: `${wolfName} (${wolfScore}) beats the field (${bestOther})`, result: 'wolf', pts: `+${pts}` }],
        summary: `Wolf wins +${pts}`,
      };
    } else if (wolfScore > bestOther) {
      return {
        type: 'lone',
        lines: [{ label: `${wolfName} (${wolfScore}) loses to ${bestOtherName} (${bestOther})`, result: 'field', pts: '+1 each' }],
        summary: 'Field wins +1 each',
      };
    } else {
      return {
        type: 'lone',
        lines: [{ label: `${wolfName} (${wolfScore}) ties the field (${bestOther})`, result: 'push', pts: '—' }],
        summary: 'No blood',
      };
    }
  }

  const wolfTeam = [hole.wolf, hole.partner!];
  const otherTeam = hole.players.filter(p => !wolfTeam.includes(p));

  const wolfSorted = [...wolfTeam].sort((a, b) => hole.netScores[a] - hole.netScores[b]);
  const otherSorted = [...otherTeam].sort((a, b) => hole.netScores[a] - hole.netScores[b]);

  const wBest = wolfSorted[0], wBestScore = hole.netScores[wBest];
  const oBest = otherSorted[0], oBestScore = hole.netScores[oBest];

  const lines: HoleMatchupDetail['lines'] = [];
  let summary: string;

  if (wBestScore < oBestScore) {
    lines.push({ label: `${wBest} (${wBestScore}) beats ${oBest} (${oBestScore})`, result: 'wolf' });
    summary = 'Wolf team wins — +1 each';
  } else if (oBestScore < wBestScore) {
    lines.push({ label: `${oBest} (${oBestScore}) beats ${wBest} (${wBestScore})`, result: 'opp' });
    summary = 'Opponents win — +1 each';
  } else {
    lines.push({ label: `${wBest} (${wBestScore}) ties ${oBest} (${oBestScore})`, result: 'push' });
    summary = 'No blood — tied';
  }

  return { type: 'team', lines, summary };
}
