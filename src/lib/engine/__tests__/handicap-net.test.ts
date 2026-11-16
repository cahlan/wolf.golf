/**
 * Tests for full-handicap net (display-only "net vs handicap"), as opposed to
 * match strokes taken off the low man.
 */

import { describe, it, expect } from 'vitest';
import type { Game, HoleInfo, CompletedHole } from '../../types/game';
import { getFullHandicapStrokes, calculateHandicapNet, getPlayerStrokesOnHole } from '../handicaps';

// SI 1..18 in hole order, all par 4 except hole 1 (par 5) and hole 2 (par 3)
const HOLES: HoleInfo[] = Array.from({ length: 18 }, (_, i) => ({
  par: (i === 0 ? 5 : i === 1 ? 3 : 4) as 3 | 4 | 5,
  strokeIndex: i + 1,
}));

const PLAYERS = ['Cahlan', 'Brad', 'Lance', 'Shane'];

function makeGame(holes: CompletedHole[], handicaps = { Cahlan: 4, Brad: 11, Lance: 14, Shane: 14 }): Game {
  return {
    id: 'test-game',
    createdAt: 0,
    gameType: 'wolf',
    players: PLAYERS,
    buyIn: 50,
    handicaps,
    wolfOrder: [0, 1, 2, 3],
    skinsEnabled: false,
    skinsValue: 0,
    course: { name: 'Test', holes: HOLES },
    holes,
    status: 'active',
    weekendId: null,
  };
}

function hole(holeNum: number, gross: Record<string, number>): CompletedHole {
  return {
    holeNum,
    par: HOLES[holeNum - 1].par,
    strokeIndex: HOLES[holeNum - 1].strokeIndex,
    wolf: 'Cahlan',
    partner: 'Brad',
    loneWolf: null,
    players: PLAYERS,
    grossScores: gross,
    netScores: gross, // not used by calculateHandicapNet
  };
}

describe('getFullHandicapStrokes', () => {
  it('gives one stroke on SI <= handicap for 0-18', () => {
    expect(getFullHandicapStrokes(4, 4)).toBe(1);
    expect(getFullHandicapStrokes(4, 5)).toBe(0);
    expect(getFullHandicapStrokes(0, 1)).toBe(0);
    expect(getFullHandicapStrokes(18, 18)).toBe(1);
  });

  it('gives two strokes on the hardest holes above 18', () => {
    expect(getFullHandicapStrokes(20, 2)).toBe(2);
    expect(getFullHandicapStrokes(20, 3)).toBe(1);
    expect(getFullHandicapStrokes(36, 18)).toBe(2);
  });

  it('plus handicaps give strokes back on the easiest holes', () => {
    expect(getFullHandicapStrokes(-2, 18)).toBe(-1);
    expect(getFullHandicapStrokes(-2, 17)).toBe(-1);
    expect(getFullHandicapStrokes(-2, 16)).toBe(0);
  });

  it('ignores holes without a valid stroke index', () => {
    expect(getFullHandicapStrokes(10, 0)).toBe(0);
  });
});

describe('calculateHandicapNet', () => {
  it('nets against the full handicap, unlike match strokes off the low man', () => {
    // Holes 1-5 (SI 1-5), par 5+3+4+4+4 = 20
    const game = makeGame([1, 2, 3, 4, 5].map(n => hole(n, { Cahlan: 5, Brad: 5, Lance: 5, Shane: 5 })));
    const net = calculateHandicapNet(game);

    // Cahlan (4): full strokes on SI 1-4 → 4; match strokes off low man → 0
    expect(net.Cahlan).toEqual({ holesPlayed: 5, gross: 25, net: 21, par: 20, toPar: 1 });
    expect([1, 2, 3, 4, 5].map(n => getPlayerStrokesOnHole(game, 'Cahlan', n))).toEqual([0, 0, 0, 0, 0]);

    // Brad (11): full strokes on all of SI 1-5
    expect(net.Brad).toMatchObject({ gross: 25, net: 20, toPar: 0 });
  });

  it('only counts holes the player has a score for', () => {
    const game = makeGame([hole(1, { Cahlan: 4, Brad: 6, Lance: 5, Shane: 5 })]);
    const net = calculateHandicapNet(game);
    expect(net.Cahlan).toEqual({ holesPlayed: 1, gross: 4, net: 3, par: 5, toPar: -2 });
  });

  it('is all zeros before any holes are played', () => {
    const net = calculateHandicapNet(makeGame([]));
    expect(net.Lance).toEqual({ holesPlayed: 0, gross: 0, net: 0, par: 0, toPar: 0 });
  });
});
