import type { CompletedHole, ThreeTwoOneMatchupDetail } from '../types/game';

/**
 * 3-2-1 scoring: rank 3 players by net score each hole.
 * Best net → 3 pts, middle → 2 pts, worst → 1 pt.
 * Ties split the combined points equally.
 * Total per hole is always 6 (3+2+1).
 */
export function calculateThreeTwoOneHolePoints(hole: CompletedHole): Record<string, number> {
  const points: Record<string, number> = {};
  hole.players.forEach(p => (points[p] = 0));

  const sorted = hole.players
    .map(p => ({ name: p, net: hole.netScores[p] }))
    .sort((a, b) => a.net - b.net);

  const [a, b, c] = sorted;

  if (a.net === b.net && b.net === c.net) {
    // All three tie → 2 each
    sorted.forEach(p => (points[p.name] = 2));
  } else if (a.net === b.net) {
    // Two tie for best → (3+2)/2 = 2.5 each, worst gets 1
    points[a.name] = 2.5;
    points[b.name] = 2.5;
    points[c.name] = 1;
  } else if (b.net === c.net) {
    // Two tie for worst → best gets 3, (2+1)/2 = 1.5 each
    points[a.name] = 3;
    points[b.name] = 1.5;
    points[c.name] = 1.5;
  } else {
    // No ties → 3, 2, 1
    points[a.name] = 3;
    points[b.name] = 2;
    points[c.name] = 1;
  }

  return points;
}

/**
 * Returns display data for the 3-2-1 ranking on a hole.
 */
export function getThreeTwoOneMatchupDetail(hole: CompletedHole): ThreeTwoOneMatchupDetail {
  const points = calculateThreeTwoOneHolePoints(hole);

  const rankings = hole.players
    .map(p => ({ name: p, netScore: hole.netScores[p], points: points[p] }))
    .sort((a, b) => a.netScore - b.netScore);

  const [a, b, c] = rankings;
  let summary: string;
  if (a.netScore === b.netScore && b.netScore === c.netScore) {
    summary = 'All square — 2 pts each';
  } else if (a.netScore === b.netScore) {
    summary = `${a.name} & ${b.name} tie for best — 2.5 each`;
  } else if (b.netScore === c.netScore) {
    summary = `${a.name} takes it — ${b.name} & ${c.name} split 2nd/3rd`;
  } else {
    summary = `${a.name} takes 3, ${b.name} takes 2, ${c.name} takes 1`;
  }

  return { rankings, summary };
}
