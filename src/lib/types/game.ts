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
export type GameStatus = 'active' | 'complete' | 'abandoned';

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

export interface CreateGameParams {
  players: string[];
  buyIn: number;
  handicaps: Record<string, number>;
  wolfOrder: number[];
  skinsEnabled: boolean;
  skinsValue: number;
  course: Course;
}
