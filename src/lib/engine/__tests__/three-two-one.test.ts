import { describe, it, expect } from 'vitest';
import type { CompletedHole } from '../../types/game';
import { calculateThreeTwoOneHolePoints } from '../three-two-one';

const PLAYERS = ['A', 'B', 'C'];

function hole(net: Record<string, number>): CompletedHole {
  return {
    holeNum: 1,
    par: 4,
    strokeIndex: 1,
    wolf: 'A',
    partner: null,
    loneWolf: null,
    players: PLAYERS,
    grossScores: { A: 0, B: 0, C: 0 },
    netScores: net,
  };
}

describe('3-2-1 scoring', () => {
  it('no ties → 3/2/1 (total 6)', () => {
    const pts = calculateThreeTwoOneHolePoints(hole({ A: 3, B: 4, C: 5 }));
    expect(pts.A).toBe(3);
    expect(pts.B).toBe(2);
    expect(pts.C).toBe(1);
    expect(pts.A + pts.B + pts.C).toBe(6);
  });

  it('all tie → 2 each (total 6)', () => {
    const pts = calculateThreeTwoOneHolePoints(hole({ A: 4, B: 4, C: 4 }));
    expect(pts.A).toBe(2);
    expect(pts.B).toBe(2);
    expect(pts.C).toBe(2);
    expect(pts.A + pts.B + pts.C).toBe(6);
  });

  it('two tie for best → 3/3/0 (total 6)', () => {
    const pts = calculateThreeTwoOneHolePoints(hole({ A: 4, B: 4, C: 5 }));
    expect(pts.A).toBe(3);
    expect(pts.B).toBe(3);
    expect(pts.C).toBe(0);
    expect(pts.A + pts.B + pts.C).toBe(6);
  });

  it('two tie for worst → 6/0/0 (total 6)', () => {
    const pts = calculateThreeTwoOneHolePoints(hole({ A: 3, B: 4, C: 4 }));
    expect(pts.A).toBe(6);
    expect(pts.B).toBe(0);
    expect(pts.C).toBe(0);
    expect(pts.A + pts.B + pts.C).toBe(6);
  });
});
