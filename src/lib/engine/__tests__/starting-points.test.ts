/**
 * Tests for startingPoints (carryover) feature.
 * Verifies that per-player point offsets are correctly applied to standings and settlement.
 */

import { describe, it, expect } from 'vitest';
import type { Game, HoleInfo } from '../../types/game';
import { calculateStandings } from '../standings';
import { calculateSettlement } from '../settlement';

const HOLES: HoleInfo[] = Array.from({ length: 18 }, (_, i) => ({ par: 4, strokeIndex: i + 1 }));

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'test-game',
    createdAt: 0,
    gameType: 'wolf',
    players: ['Alice', 'Bob', 'Carol', 'Dan'],
    buyIn: 10,
    handicaps: { Alice: 0, Bob: 0, Carol: 0, Dan: 0 },
    wolfOrder: [0, 1, 2, 3],
    skinsEnabled: false,
    skinsValue: 0,
    course: { name: 'Test', holes: HOLES },
    holes: [],
    status: 'active',
    weekendId: null,
    ...overrides,
  };
}

describe('startingPoints (carryover)', () => {
  it('standings are zero with no holes and no starting points', () => {
    const game = makeGame();
    const standings = calculateStandings(game);
    standings.forEach(s => expect(s.points).toBe(0));
  });

  it('applies startingPoints offset to standings', () => {
    const game = makeGame({
      startingPoints: { Alice: 3, Bob: -2, Carol: 0, Dan: 1 },
    });
    const standings = calculateStandings(game);
    const byName = Object.fromEntries(standings.map(s => [s.name, s.points]));
    expect(byName.Alice).toBe(3);
    expect(byName.Bob).toBe(-2);
    expect(byName.Carol).toBe(0);
    expect(byName.Dan).toBe(1);
    // Sorted descending
    expect(standings[0].name).toBe('Alice');
    expect(standings[1].name).toBe('Dan');
  });

  it('adds earned points on top of starting points', () => {
    const game = makeGame({
      startingPoints: { Alice: 2, Bob: 0, Carol: 0, Dan: 0 },
      holes: [
        {
          holeNum: 1,
          par: 4,
          strokeIndex: 1,
          wolf: 'Alice',
          partner: 'Bob',
          loneWolf: null,
          players: ['Alice', 'Bob', 'Carol', 'Dan'],
          grossScores: { Alice: 4, Bob: 4, Carol: 5, Dan: 5 },
          netScores: { Alice: 4, Bob: 4, Carol: 5, Dan: 5 },
        },
      ],
    });
    const standings = calculateStandings(game);
    const byName = Object.fromEntries(standings.map(s => [s.name, s.points]));
    // Wolf team (Alice+Bob) wins hole → +1 each; Alice also had +2 carryover
    expect(byName.Alice).toBe(3); // 2 carryover + 1 hole
    expect(byName.Bob).toBe(1);   // 0 carryover + 1 hole
    expect(byName.Carol).toBe(0);
    expect(byName.Dan).toBe(0);
  });

  it('settlement reflects starting-points-adjusted standings order', () => {
    // Alice starts with a huge advantage — should still win settlement
    const game = makeGame({
      startingPoints: { Alice: 10, Bob: 0, Carol: 0, Dan: 0 },
      status: 'complete',
    });
    const settlement = calculateSettlement(game);
    // Alice has 10 pts, everyone else 0 — she's 1st, should receive buyIn × 2
    expect(settlement.wolfNet.Alice).toBeGreaterThan(0);
    expect(settlement.wolfNet.Bob).toBeLessThanOrEqual(0);
  });

  it('missing players in startingPoints default to 0', () => {
    const game = makeGame({
      startingPoints: { Alice: 5 }, // Bob/Carol/Dan not in map
    });
    const standings = calculateStandings(game);
    const byName = Object.fromEntries(standings.map(s => [s.name, s.points]));
    expect(byName.Alice).toBe(5);
    expect(byName.Bob).toBe(0);
    expect(byName.Carol).toBe(0);
    expect(byName.Dan).toBe(0);
  });
});
