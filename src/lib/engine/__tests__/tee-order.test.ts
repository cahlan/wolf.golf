import { describe, it, expect } from 'vitest';
import type { Game } from '../../types/game';
import { getTeeOrderForHole } from '../tee-order';

function makeGame(overrides?: Partial<Game>): Game {
  return {
    id: 'G',
    createdAt: 0,
    players: ['A', 'B', 'C', 'D'],
    buyIn: 0,
    handicaps: { A: 0, B: 0, C: 0, D: 0 },
    wolfOrder: [0, 1, 2, 3],
    skinsEnabled: false,
    skinsValue: 0,
    course: {
      name: 'X',
      holes: Array.from({ length: 18 }, () => ({ par: 4 as const, strokeIndex: 1 })),
    },
    holes: [],
    status: 'active',
    weekendId: null,
    ...overrides,
  };
}

describe('getTeeOrderForHole', () => {
  it('setup order defines wolf rotation; wolf hits first; others follow cyclic order starting after the wolf', () => {
    const game = makeGame({ startingHole: 1, lastPlaceWolf: false });

    // With wolfOrder=[A,B,C,D]:
    // Hole 1 wolf = A, so A hits first; order follows after A.
    expect(getTeeOrderForHole(game, 1)).toEqual(['A', 'B', 'C', 'D']);

    // Hole 2 wolf = B
    expect(getTeeOrderForHole(game, 2)).toEqual(['B', 'C', 'D', 'A']);

    // Hole 3 wolf = C
    expect(getTeeOrderForHole(game, 3)).toEqual(['C', 'D', 'A', 'B']);

    // Hole 4 wolf = D
    expect(getTeeOrderForHole(game, 4)).toEqual(['D', 'A', 'B', 'C']);

    // Hole 5 cycles back to wolf = A
    expect(getTeeOrderForHole(game, 5)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('respects startingHole offset (wolf rotation uses startingHole)', () => {
    const game = makeGame({ startingHole: 3, lastPlaceWolf: false });

    // With startingHole=3 and wolfOrder=[A,B,C,D]:
    // hole 3 wolf = A, hole 4 wolf = B
    expect(getTeeOrderForHole(game, 3)).toEqual(['A', 'B', 'C', 'D']);
    expect(getTeeOrderForHole(game, 4)).toEqual(['B', 'C', 'D', 'A']);
  });
});
