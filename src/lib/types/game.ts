export interface HoleInfo {
  par: 3 | 4 | 5;
  strokeIndex: number;
}

export interface Course {
  name: string;
  holes: HoleInfo[];
}

export interface PlayerProfile {
  name: string;
  handicap: number;
}

export type LoneWolfType = 'early' | 'late' | 'default';
export type GameType = 'wolf' | 'six';
export type GameStatus = 'active' | 'complete' | 'abandoned';

export interface PendingWolfDecision {
  holeNum: number;
  wolf: string;
  partner: string | null;
  loneWolf: LoneWolfType | null;
}

export interface CompletedHole {
  holeNum: number;
  par: number;
  strokeIndex: number;
  wolf: string;
  partner: string | null;
  loneWolf: LoneWolfType | null;
  players: string[];
  grossScores: Record<string, number>;
  netScores: Record<string, number>;
}

export interface Game {
  id: string;
  createdAt: number;
  gameType?: GameType;                  // default: 'wolf'
  players: string[];
  buyIn: number;
  handicaps: Record<string, number>;
  wolfOrder: number[];
  skinsEnabled: boolean;
  skinsValue: number;
  course: Course;
  holes: CompletedHole[];
  status: GameStatus;
  weekendId: string | null;
  teamSegments?: [number, number][];    // 6x6x6: 3 pairs of player indices, one per 6-hole segment
  // Advanced config — all optional with defaults
  startingHole?: number;                // default: 1
  lastPlaceWolf?: boolean;              // default: true
  lastPlaceWolfStartHole?: number;      // default: 17
  payoutStructure?: 'winner-takes-all' | 'top-two-split' | 'top-three-split'; // default: 'winner-takes-all'
  skinsCarryover?: boolean;             // default: true
  pendingWolfDecision?: PendingWolfDecision | null;

  // Weekend scoring overrides
  // Map player name -> placement number (1 = first). Used for weekend standings only.
  weekendPlacementOverride?: Record<string, number>;
}

export interface HoleInput {
  holeNum: number;
  wolf: string;
  partner: string | null;
  loneWolf: LoneWolfType | null;
  grossScores: Record<string, string>;
  phase: 'wolf-decision' | 'scores';
}

export interface DebtTransfer {
  from: string;
  to: string;
  amount: number;
}

export interface Standing {
  name: string;
  points: number;
}

export interface SkinsData {
  skins: Record<string, number>;
  carryover: number;
}

export interface Settlement {
  standings: Standing[];
  wolfNet: Record<string, number>;
  skinsNet: Record<string, number>;
  skins: Record<string, number>;
  totalNet: Record<string, number>;
  transfers: DebtTransfer[];
}

export interface HoleMatchupLine {
  label: string;
  result: 'wolf' | 'opp' | 'field' | 'push';
  pts?: string;
}

export interface HoleMatchupDetail {
  type: 'lone' | 'team';
  lines: HoleMatchupLine[];
  summary: string;
}

export interface SixHoleMatchupDetail {
  lowBall: {
    teamAPlayer: string;
    teamANet: number;
    teamBPlayer: string;
    teamBNet: number;
    result: 'teamA' | 'teamB' | 'push';
  };
  highBall: {
    teamAPlayer: string;
    teamANet: number;
    teamBPlayer: string;
    teamBNet: number;
    result: 'teamA' | 'teamB' | 'push';
  };
  summary: string;
}

export interface CreateGameParams {
  gameType?: GameType;
  players: string[];
  buyIn: number;
  handicaps: Record<string, number>;
  wolfOrder?: number[];
  skinsEnabled: boolean;
  skinsValue: number;
  course: Course;
  teamSegments?: [number, number][];
  // Advanced config — all optional with defaults
  startingHole?: number;
  lastPlaceWolf?: boolean;
  lastPlaceWolfStartHole?: number;
  payoutStructure?: 'winner-takes-all' | 'top-two-split' | 'top-three-split';
  skinsCarryover?: boolean;
}
