/**
 * Test suite for the 6x6x6 Hi/Low scoring engine.
 *
 * Player setup (same as wolf fixtures):
 *   players = ['Lance', 'Cahlan', 'Brad', 'Shane']
 *   Handicaps: Lance=10, Cahlan=4, Brad=14, Shane=12
 *   Min HC = 4 (Cahlan). Diffs: Lance=6, Cahlan=0, Brad=10, Shane=8
 *
 * Team segments (default):
 *   Segment 0 (H1-6): [0,1] → Lance+Cahlan vs Brad+Shane
 *   Segment 1 (H7-12): [0,2] → Lance+Brad vs Cahlan+Shane
 *   Segment 2 (H13-18): [0,3] → Lance+Shane vs Cahlan+Brad
 */
import { describe, it, expect } from 'vitest';
import type { Game, CompletedHole, HoleInfo } from '../../types/game';
import {
  getSegmentForHole,
  getTeamsForHole,
  calculateSixHolePoints,
  getSixHoleMatchupDetail,
  generateDefaultSegments,
} from '../six';
import { calculateGameHolePoints } from '../scoring-utils';
import { calculateStandings } from '../standings';
import { calculateSkins } from '../skins';
import { calculateSettlement } from '../settlement';

// ─── Constants ───────────────────────────────────────────────────────────────

const PLAYERS = ['Lance', 'Cahlan', 'Brad', 'Shane'];

const HANDICAPS: Record<string, number> = {
  Lance: 10,
  Cahlan: 4,
  Brad: 14,
  Shane: 12,
};

const COURSE_HOLES: HoleInfo[] = [
  { par: 4, strokeIndex: 15 }, // H1
  { par: 4, strokeIndex: 13 }, // H2
  { par: 3, strokeIndex: 17 }, // H3
  { par: 4, strokeIndex: 1 },  // H4
  { par: 5, strokeIndex: 5 },  // H5
  { par: 4, strokeIndex: 9 },  // H6
  { par: 4, strokeIndex: 7 },  // H7
  { par: 3, strokeIndex: 3 },  // H8
  { par: 5, strokeIndex: 11 }, // H9
  { par: 4, strokeIndex: 16 }, // H10
  { par: 3, strokeIndex: 18 }, // H11
  { par: 4, strokeIndex: 2 },  // H12
  { par: 5, strokeIndex: 10 }, // H13
  { par: 4, strokeIndex: 8 },  // H14
  { par: 4, strokeIndex: 6 },  // H15
  { par: 4, strokeIndex: 12 }, // H16
  { par: 3, strokeIndex: 14 }, // H17
  { par: 4, strokeIndex: 4 },  // H18
];

const DIFFS: Record<string, number> = { Lance: 6, Cahlan: 0, Brad: 10, Shane: 8 };

const DEFAULT_SEGMENTS: [number, number][] = [[0, 1], [0, 2], [0, 3]];

function makeSixGame(holes: CompletedHole[] = []): Game {
  return {
    id: 'TEST6',
    createdAt: 0,
    gameType: 'six',
    players: PLAYERS,
    buyIn: 50,
    handicaps: HANDICAPS,
    wolfOrder: [],
    skinsEnabled: true,
    skinsValue: 5,
    course: { name: 'Test Course', holes: COURSE_HOLES },
    holes,
    status: 'active',
    weekendId: null,
    teamSegments: DEFAULT_SEGMENTS,
    payoutStructure: 'winner-takes-all',
    skinsCarryover: true,
  };
}

function makeHole(opts: {
  holeNum: number;
  grossScores: Record<string, number>;
}): CompletedHole {
  const hi = COURSE_HOLES[opts.holeNum - 1];
  const netScores: Record<string, number> = {};
  for (const p of PLAYERS) {
    const strokes = hi.strokeIndex <= DIFFS[p] ? 1 : 0;
    netScores[p] = opts.grossScores[p] - strokes;
  }
  // For 6x6x6: wolf = teamA[0], partner = teamA[1], loneWolf = null
  const game = makeSixGame();
  const { teamA } = getTeamsForHole(game, opts.holeNum);
  return {
    holeNum: opts.holeNum,
    par: hi.par,
    strokeIndex: hi.strokeIndex,
    wolf: teamA[0],
    partner: teamA[1],
    loneWolf: null,
    players: PLAYERS,
    grossScores: opts.grossScores,
    netScores,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('6x6x6 Engine', () => {
  // 1. Segment assignment
  describe('getSegmentForHole', () => {
    it('assigns holes 1-6 to segment 0', () => {
      for (let h = 1; h <= 6; h++) expect(getSegmentForHole(h)).toBe(0);
    });
    it('assigns holes 7-12 to segment 1', () => {
      for (let h = 7; h <= 12; h++) expect(getSegmentForHole(h)).toBe(1);
    });
    it('assigns holes 13-18 to segment 2', () => {
      for (let h = 13; h <= 18; h++) expect(getSegmentForHole(h)).toBe(2);
    });
  });

  // 2. Team lookup per segment
  describe('getTeamsForHole', () => {
    const game = makeSixGame();

    it('returns correct teams for segment 0 (H1-6)', () => {
      const { teamA, teamB } = getTeamsForHole(game, 1);
      expect(teamA).toEqual(['Lance', 'Cahlan']);
      expect(teamB).toEqual(['Brad', 'Shane']);
    });

    it('returns correct teams for segment 1 (H7-12)', () => {
      const { teamA, teamB } = getTeamsForHole(game, 7);
      expect(teamA).toEqual(['Lance', 'Brad']);
      expect(teamB).toEqual(['Cahlan', 'Shane']);
    });

    it('returns correct teams for segment 2 (H13-18)', () => {
      const { teamA, teamB } = getTeamsForHole(game, 13);
      expect(teamA).toEqual(['Lance', 'Shane']);
      expect(teamB).toEqual(['Cahlan', 'Brad']);
    });
  });

  // 3. Low ball win — team A
  it('low ball win for team A awards +1 each to team A', () => {
    // H1: SI=15, no strokes for anyone. teamA = Lance+Cahlan, teamB = Brad+Shane
    const hole = makeHole({
      holeNum: 1,
      grossScores: { Lance: 4, Cahlan: 3, Brad: 5, Shane: 5 },
    });
    // Net: Lance=4, Cahlan=3, Brad=5, Shane=5
    // Low: teamA=3 (Cahlan), teamB=5 → teamA wins low
    // High: teamA=4 (Lance), teamB=5 → teamA wins high
    const pts = calculateSixHolePoints(hole, ['Lance', 'Cahlan'], ['Brad', 'Shane']);
    expect(pts['Lance']).toBe(2); // wins both
    expect(pts['Cahlan']).toBe(2);
    expect(pts['Brad']).toBe(0);
    expect(pts['Shane']).toBe(0);
  });

  // 4. Low ball win — team B
  it('low ball win for team B awards +1 each to team B', () => {
    // H1: no strokes. teamA = Lance+Cahlan, teamB = Brad+Shane
    const hole = makeHole({
      holeNum: 1,
      grossScores: { Lance: 5, Cahlan: 5, Brad: 3, Shane: 4 },
    });
    // Net: all same as gross (no strokes on H1)
    // Low: teamA=5, teamB=3 → teamB wins low
    // High: teamA=5, teamB=4 → teamB wins high (4 < 5)
    const pts = calculateSixHolePoints(hole, ['Lance', 'Cahlan'], ['Brad', 'Shane']);
    expect(pts['Brad']).toBe(2);
    expect(pts['Shane']).toBe(2);
    expect(pts['Lance']).toBe(0);
    expect(pts['Cahlan']).toBe(0);
  });

  // 5. Low ball push (tied best nets)
  it('low ball push when tied — no points for low', () => {
    const hole = makeHole({
      holeNum: 1,
      grossScores: { Lance: 4, Cahlan: 5, Brad: 4, Shane: 6 },
    });
    // Net: Lance=4, Cahlan=5, Brad=4, Shane=6
    // Low: both 4 → push
    // High: teamA=5, teamB=6 → teamA wins high
    const pts = calculateSixHolePoints(hole, ['Lance', 'Cahlan'], ['Brad', 'Shane']);
    expect(pts['Lance']).toBe(1); // high ball only
    expect(pts['Cahlan']).toBe(1);
    expect(pts['Brad']).toBe(0);
    expect(pts['Shane']).toBe(0);
  });

  // 6. High ball push
  it('high ball push when tied — no points for high', () => {
    const hole = makeHole({
      holeNum: 1,
      grossScores: { Lance: 3, Cahlan: 5, Brad: 4, Shane: 5 },
    });
    // Net: all same (no strokes H1)
    // Low: teamA=3, teamB=4 → teamA wins low
    // High: teamA=5, teamB=5 → push
    const pts = calculateSixHolePoints(hole, ['Lance', 'Cahlan'], ['Brad', 'Shane']);
    expect(pts['Lance']).toBe(1); // low ball only
    expect(pts['Cahlan']).toBe(1);
    expect(pts['Brad']).toBe(0);
    expect(pts['Shane']).toBe(0);
  });

  // 7. Clean sweep
  it('clean sweep — one team wins both hi and low', () => {
    const hole = makeHole({
      holeNum: 1,
      grossScores: { Lance: 3, Cahlan: 4, Brad: 5, Shane: 6 },
    });
    // Low: 3 vs 5 → teamA. High: 4 vs 6 → teamA.
    const pts = calculateSixHolePoints(hole, ['Lance', 'Cahlan'], ['Brad', 'Shane']);
    expect(pts['Lance']).toBe(2);
    expect(pts['Cahlan']).toBe(2);
    expect(pts['Brad']).toBe(0);
    expect(pts['Shane']).toBe(0);
  });

  // 8. Split — each team wins one ball
  it('split — each team wins one ball', () => {
    const hole = makeHole({
      holeNum: 1,
      grossScores: { Lance: 3, Cahlan: 7, Brad: 4, Shane: 5 },
    });
    // Net (no strokes H1): Lance=3, Cahlan=7, Brad=4, Shane=5
    // Low: teamA=3, teamB=4 → teamA wins low (+1 each)
    // High: teamA=7, teamB=5 → teamB wins high (+1 each)
    const pts = calculateSixHolePoints(hole, ['Lance', 'Cahlan'], ['Brad', 'Shane']);
    expect(pts['Lance']).toBe(1);
    expect(pts['Cahlan']).toBe(1);
    expect(pts['Brad']).toBe(1);
    expect(pts['Shane']).toBe(1);
  });

  // 9. Full push — all 4 players tie
  it('full push — all tied, no points', () => {
    const hole = makeHole({
      holeNum: 1,
      grossScores: { Lance: 4, Cahlan: 4, Brad: 4, Shane: 4 },
    });
    const pts = calculateSixHolePoints(hole, ['Lance', 'Cahlan'], ['Brad', 'Shane']);
    expect(pts['Lance']).toBe(0);
    expect(pts['Cahlan']).toBe(0);
    expect(pts['Brad']).toBe(0);
    expect(pts['Shane']).toBe(0);
  });

  // 10. Standings accumulation across 6 holes
  it('accumulates standings across a segment', () => {
    const holes: CompletedHole[] = [];
    // Play 6 holes where teamA (Lance+Cahlan) wins low each time
    for (let h = 1; h <= 6; h++) {
      holes.push(makeHole({
        holeNum: h,
        grossScores: { Lance: 3, Cahlan: 4, Brad: 5, Shane: 5 },
      }));
    }
    const game = makeSixGame(holes);
    const standings = calculateStandings(game);
    const pts: Record<string, number> = {};
    standings.forEach(s => (pts[s.name] = s.points));

    // H1-H3: no strokes → teamA sweeps both hi/low → +2 each (3×2=6)
    // H4 SI=1: Lance/Brad/Shane get strokes → nets 2,4,4,4 → low win + high push → +1 each
    // H5 SI=5: Lance/Brad/Shane get strokes → nets 2,4,4,4 → low win + high push → +1 each
    // H6 SI=9: Brad only gets stroke → nets 3,4,4,5 → teamA sweeps → +2 each
    // Total: 6 + 1 + 1 + 2 = 10
    expect(pts['Lance']).toBe(10);
    expect(pts['Cahlan']).toBe(10);
    expect(pts['Brad']).toBe(0);
    expect(pts['Shane']).toBe(0);
  });

  // 11. Full 18-hole game with settlement
  it('completes 18-hole game with settlement', () => {
    const holes: CompletedHole[] = [];
    for (let h = 1; h <= 18; h++) {
      // Alternate: odd holes teamA wins low, even holes teamB wins low
      if (h % 2 === 1) {
        holes.push(makeHole({
          holeNum: h,
          grossScores: { Lance: 3, Cahlan: 5, Brad: 5, Shane: 6 },
        }));
      } else {
        holes.push(makeHole({
          holeNum: h,
          grossScores: { Lance: 5, Cahlan: 6, Brad: 3, Shane: 5 },
        }));
      }
    }
    const game = makeSixGame(holes);
    game.status = 'complete';
    const settlement = calculateSettlement(game);
    // Verify settlement has all players and no NaN
    expect(settlement.standings.length).toBe(4);
    settlement.standings.forEach(s => {
      expect(typeof s.points).toBe('number');
      expect(Number.isNaN(s.points)).toBe(false);
    });
    // Verify transfers sum to zero
    let totalTransferred = 0;
    settlement.transfers.forEach(t => {
      expect(t.amount).toBeGreaterThan(0);
      totalTransferred += t.amount;
    });
    // Net should sum to 0 across all players
    const netSum = Object.values(settlement.totalNet).reduce((a, b) => a + b, 0);
    expect(Math.abs(netSum)).toBeLessThan(0.01);
  });

  // 12. Skins work alongside 6x6x6
  it('skins work correctly alongside 6x6x6 scoring', () => {
    // H1: Cahlan has outright lowest net (skin winner)
    // H2: Everyone ties (skin carries)
    const h1 = makeHole({
      holeNum: 1,
      grossScores: { Lance: 5, Cahlan: 3, Brad: 5, Shane: 5 },
    });
    const h2 = makeHole({
      holeNum: 2,
      grossScores: { Lance: 4, Cahlan: 4, Brad: 4, Shane: 4 },
    });
    const game = makeSixGame([h1, h2]);
    const skinsData = calculateSkins(game);

    // H1: Cahlan net=3, others 5 → Cahlan wins 1 skin
    // H2: all tied at 4 → carryover
    expect(skinsData.skins['Cahlan']).toBe(1);
    expect(skinsData.carryover).toBe(1);
  });

  // 13. Default segment generation
  it('generates 3 unique pairings', () => {
    const segments = generateDefaultSegments();
    expect(segments.length).toBe(3);
    // All pairs should be unique
    const keys = segments.map(s => `${s[0]}-${s[1]}`);
    expect(new Set(keys).size).toBe(3);
    // Player 0 should appear in every segment
    segments.forEach(s => expect(s).toContain(0));
  });

  // 14. calculateGameHolePoints dispatches correctly for six
  it('calculateGameHolePoints dispatches to 6x6x6 scoring', () => {
    const hole = makeHole({
      holeNum: 1,
      grossScores: { Lance: 3, Cahlan: 4, Brad: 5, Shane: 6 },
    });
    const game = makeSixGame([hole]);
    const pts = calculateGameHolePoints(game, hole);
    // teamA (Lance+Cahlan) sweeps: +2 each
    expect(pts['Lance']).toBe(2);
    expect(pts['Cahlan']).toBe(2);
    expect(pts['Brad']).toBe(0);
    expect(pts['Shane']).toBe(0);
  });

  // 15. calculateGameHolePoints defaults to wolf for games without gameType
  it('calculateGameHolePoints defaults to wolf scoring for legacy games', () => {
    const hole: CompletedHole = {
      holeNum: 1,
      par: 4,
      strokeIndex: 15,
      wolf: 'Lance',
      partner: 'Cahlan',
      loneWolf: null,
      players: PLAYERS,
      grossScores: { Lance: 3, Cahlan: 4, Brad: 5, Shane: 5 },
      netScores: { Lance: 3, Cahlan: 4, Brad: 5, Shane: 5 },
    };
    const game: Game = {
      id: 'WOLF1',
      createdAt: 0,
      players: PLAYERS,
      buyIn: 50,
      handicaps: HANDICAPS,
      wolfOrder: [0, 1, 2, 3],
      skinsEnabled: false,
      skinsValue: 0,
      course: { name: 'Test', holes: COURSE_HOLES },
      holes: [hole],
      status: 'active',
      weekendId: null,
    };
    const pts = calculateGameHolePoints(game, hole);
    // Wolf scoring: wolf team (Lance+Cahlan) best=3 vs opponents best=5 → wolf team wins +1
    expect(pts['Lance']).toBe(1);
    expect(pts['Cahlan']).toBe(1);
    expect(pts['Brad']).toBe(0);
    expect(pts['Shane']).toBe(0);
  });

  // 16. Matchup detail
  describe('getSixHoleMatchupDetail', () => {
    it('returns correct detail for a split', () => {
      const hole = makeHole({
        holeNum: 1,
        grossScores: { Lance: 3, Cahlan: 7, Brad: 4, Shane: 5 },
      });
      const detail = getSixHoleMatchupDetail(hole, ['Lance', 'Cahlan'], ['Brad', 'Shane']);
      expect(detail.lowBall.result).toBe('teamA');
      expect(detail.highBall.result).toBe('teamB');
      expect(detail.summary).toContain('Split');
    });

    it('returns correct detail for a sweep', () => {
      const hole = makeHole({
        holeNum: 1,
        grossScores: { Lance: 3, Cahlan: 4, Brad: 5, Shane: 6 },
      });
      const detail = getSixHoleMatchupDetail(hole, ['Lance', 'Cahlan'], ['Brad', 'Shane']);
      expect(detail.lowBall.result).toBe('teamA');
      expect(detail.highBall.result).toBe('teamA');
      expect(detail.summary).toContain('sweep');
    });

    it('returns correct detail for a full push', () => {
      const hole = makeHole({
        holeNum: 1,
        grossScores: { Lance: 4, Cahlan: 4, Brad: 4, Shane: 4 },
      });
      const detail = getSixHoleMatchupDetail(hole, ['Lance', 'Cahlan'], ['Brad', 'Shane']);
      expect(detail.lowBall.result).toBe('push');
      expect(detail.highBall.result).toBe('push');
      expect(detail.summary).toContain('push');
    });
  });
});
