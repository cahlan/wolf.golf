import type { Game, CompletedHole, HoleInfo } from './types/game';

const PLAYERS = ['Lance', 'Cahlan', 'Brad', 'Shane'];

const HANDICAPS: Record<string, number> = {
  Lance: 10,
  Cahlan: 4,
  Brad: 14,
  Shane: 12,
};

const COURSE_HOLES: HoleInfo[] = [
  { par: 4, strokeIndex: 15 },
  { par: 4, strokeIndex: 13 },
  { par: 3, strokeIndex: 17 },
  { par: 4, strokeIndex: 1 },
  { par: 5, strokeIndex: 5 },
  { par: 4, strokeIndex: 9 },
  { par: 4, strokeIndex: 7 },
  { par: 3, strokeIndex: 3 },
  { par: 5, strokeIndex: 11 },
  { par: 4, strokeIndex: 16 },
  { par: 3, strokeIndex: 18 },
  { par: 4, strokeIndex: 2 },
  { par: 5, strokeIndex: 10 },
  { par: 4, strokeIndex: 8 },
  { par: 4, strokeIndex: 6 },
  { par: 4, strokeIndex: 12 },
  { par: 3, strokeIndex: 14 },
  { par: 4, strokeIndex: 4 },
];

function hole(
  holeNum: number,
  wolf: string,
  partner: string | null,
  loneWolf: CompletedHole['loneWolf'],
  grossScores: Record<string, number>,
): CompletedHole {
  const hi = COURSE_HOLES[holeNum - 1];

  // Min HC is Cahlan at 4. Diffs: Lance=6, Brad=10, Shane=8
  const diffs: Record<string, number> = { Lance: 6, Cahlan: 0, Brad: 10, Shane: 8 };
  const netScores: Record<string, number> = {};
  for (const p of PLAYERS) {
    const strokes = hi.strokeIndex <= diffs[p] ? 1 : 0;
    netScores[p] = grossScores[p] - strokes;
  }

  return {
    holeNum,
    par: hi.par,
    strokeIndex: hi.strokeIndex,
    wolf,
    partner,
    loneWolf,
    players: PLAYERS,
    grossScores,
    netScores,
  };
}

// 9 completed holes producing: Lance 6, Cahlan 3, Brad 5, Shane 4
const COMPLETED_HOLES: CompletedHole[] = [
  // Hole 1 (Par 4, SI 15, no strokes): Wolf=Lance, Partner=Brad. Wolf team wins.
  hole(1, 'Lance', 'Brad', null,
    { Lance: 4, Cahlan: 5, Brad: 4, Shane: 5 }),

  // Hole 2 (Par 4, SI 13, no strokes): Wolf=Cahlan, Partner=Shane. Wolf team wins.
  hole(2, 'Cahlan', 'Shane', null,
    { Lance: 5, Cahlan: 4, Brad: 5, Shane: 4 }),

  // Hole 3 (Par 3, SI 17, no strokes): Wolf=Brad, Partner=Lance. Wolf team wins.
  hole(3, 'Brad', 'Lance', null,
    { Lance: 3, Cahlan: 4, Brad: 3, Shane: 4 }),

  // Hole 4 (Par 4, SI 1, strokes: L/B/S each get 1): Wolf=Shane, Partner=Brad. Wolf team wins.
  hole(4, 'Shane', 'Brad', null,
    { Lance: 5, Cahlan: 5, Brad: 5, Shane: 4 }),

  // Hole 5 (Par 5, SI 5, strokes: L/B/S each get 1): Wolf=Lance, Partner=Shane. Wolf team wins.
  hole(5, 'Lance', 'Shane', null,
    { Lance: 5, Cahlan: 6, Brad: 6, Shane: 5 }),

  // Hole 6 (Par 4, SI 9, strokes: B/S each get 1): Wolf=Cahlan, Partner=Brad. Wolf team wins.
  hole(6, 'Cahlan', 'Brad', null,
    { Lance: 5, Cahlan: 4, Brad: 4, Shane: 6 }),

  // Hole 7 (Par 4, SI 7, strokes: B/S each get 1): Wolf=Brad, Partner=Lance. Wolf team wins.
  hole(7, 'Brad', 'Lance', null,
    { Lance: 4, Cahlan: 5, Brad: 4, Shane: 6 }),

  // Hole 8 (Par 3, SI 3, strokes: L/B/S each get 1): Wolf=Shane, Partner=Cahlan. Wolf team wins.
  hole(8, 'Shane', 'Cahlan', null,
    { Lance: 4, Cahlan: 3, Brad: 4, Shane: 3 }),

  // Hole 9 (Par 5, SI 11, no strokes): Wolf=Lance, lone wolf (default). Wolf wins. +2.
  hole(9, 'Lance', null, 'default',
    { Lance: 4, Cahlan: 5, Brad: 5, Shane: 5 }),

  // Hole 10 (Par 4, SI 16, no strokes): Wolf=Cahlan, early lone wolf. Cahlan wins +4.
  hole(10, 'Cahlan', null, 'early',
    { Lance: 5, Cahlan: 3, Brad: 5, Shane: 5 }),

  // Hole 11 (Par 3, SI 18, no strokes): Wolf=Brad, default lone wolf. Brad loses, field +1 each.
  hole(11, 'Brad', null, 'default',
    { Lance: 3, Cahlan: 3, Brad: 4, Shane: 3 }),

  // Hole 12 (Par 4, SI 2, strokes: L/B/S get 1): Wolf=Shane, Partner=Brad. Push vs Cahlan+Lance.
  hole(12, 'Shane', 'Brad', null,
    { Lance: 5, Cahlan: 4, Brad: 5, Shane: 5 }),

  // Hole 13 (Par 5, SI 10, strokes: B gets 1): Wolf=Lance, Partner=Brad. Push vs Cahlan+Shane.
  hole(13, 'Lance', 'Brad', null,
    { Lance: 5, Cahlan: 5, Brad: 6, Shane: 5 }),

  // Hole 14 (Par 4, SI 8, strokes: B/S get 1): Wolf=Cahlan, Partner=Brad. Wolf team wins.
  // Gross: Cahlan 5, Brad 4 vs Shane 6, Lance 4. Net: C5/B3 vs S5/L4. Wolf best 3 < 4.
  hole(14, 'Cahlan', 'Brad', null,
    { Lance: 4, Cahlan: 5, Brad: 4, Shane: 6 }),

  // Hole 15 (Par 4, SI 6, strokes: L/B/S get 1): Wolf=Brad, Partner=Lance. Opponents win.
  // Gross: Cahlan 4, Shane 5 vs Brad 6, Lance 6. Net: C4/S4 vs B5/L5. Other best 4 < 5.
  hole(15, 'Brad', 'Lance', null,
    { Lance: 6, Cahlan: 4, Brad: 6, Shane: 5 }),
];

export function createTestGame(): Game {
  return {
    id: 'TEST1',
    createdAt: Date.now(),
    players: PLAYERS,
    buyIn: 50,
    handicaps: HANDICAPS,
    wolfOrder: [0, 1, 2, 3],
    skinsEnabled: false,
    skinsValue: 0,
    course: {
      name: 'RCC',
      holes: COURSE_HOLES,
    },
    holes: COMPLETED_HOLES,
    status: 'active',
    weekendId: null,
  };
}
