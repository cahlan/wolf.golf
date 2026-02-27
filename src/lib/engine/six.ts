import type { Game, CompletedHole, SixHoleMatchupDetail } from '../types/game';

/**
 * Returns the segment index (0, 1, or 2) for a given hole number.
 * Holes 1-6 → segment 0, 7-12 → segment 1, 13-18 → segment 2.
 */
export function getSegmentForHole(holeNum: number): number {
  return Math.floor((holeNum - 1) / 6);
}

/**
 * Returns the two teams for a given hole based on the game's teamSegments.
 * teamA = the pair listed in the segment, teamB = the other two players.
 */
export function getTeamsForHole(
  game: Game,
  holeNum: number
): { teamA: [string, string]; teamB: [string, string] } {
  const segment = getSegmentForHole(holeNum);
  const segments = game.teamSegments!;
  const pair = segments[segment];
  const teamA: [string, string] = [game.players[pair[0]], game.players[pair[1]]];
  const allIndices = [0, 1, 2, 3];
  const otherIndices = allIndices.filter(i => i !== pair[0] && i !== pair[1]);
  const teamB: [string, string] = [game.players[otherIndices[0]], game.players[otherIndices[1]]];
  return { teamA, teamB };
}

/**
 * Calculate points for a 6x6x6 hole using hi/low scoring.
 * Low ball: best net per team — lower wins → +1 each to winning team.
 * High ball: worst net per team — lower wins → +1 each to winning team.
 * Pushes award no points.
 */
export function calculateSixHolePoints(
  hole: CompletedHole,
  teamA: [string, string],
  teamB: [string, string]
): Record<string, number> {
  const points: Record<string, number> = {};
  hole.players.forEach(p => (points[p] = 0));

  const teamANets = teamA.map(p => hole.netScores[p]);
  const teamBNets = teamB.map(p => hole.netScores[p]);

  // Low ball: min net per team
  const teamALow = Math.min(...teamANets);
  const teamBLow = Math.min(...teamBNets);

  if (teamALow < teamBLow) {
    teamA.forEach(p => (points[p] += 1));
  } else if (teamBLow < teamALow) {
    teamB.forEach(p => (points[p] += 1));
  }

  // High ball: max net per team
  const teamAHigh = Math.max(...teamANets);
  const teamBHigh = Math.max(...teamBNets);

  if (teamAHigh < teamBHigh) {
    teamA.forEach(p => (points[p] += 1));
  } else if (teamBHigh < teamAHigh) {
    teamB.forEach(p => (points[p] += 1));
  }

  return points;
}

/**
 * Returns display data for the hi/low matchup on a 6x6x6 hole.
 */
export function getSixHoleMatchupDetail(
  hole: CompletedHole,
  teamA: [string, string],
  teamB: [string, string]
): SixHoleMatchupDetail {
  // Low ball
  const teamALowPlayer = teamA[0] !== undefined && hole.netScores[teamA[0]] <= hole.netScores[teamA[1]] ? teamA[0] : teamA[1];
  const teamBLowPlayer = teamB[0] !== undefined && hole.netScores[teamB[0]] <= hole.netScores[teamB[1]] ? teamB[0] : teamB[1];
  const teamALowNet = hole.netScores[teamALowPlayer];
  const teamBLowNet = hole.netScores[teamBLowPlayer];
  const lowResult: 'teamA' | 'teamB' | 'push' =
    teamALowNet < teamBLowNet ? 'teamA' : teamBLowNet < teamALowNet ? 'teamB' : 'push';

  // High ball
  const teamAHighPlayer = hole.netScores[teamA[0]] >= hole.netScores[teamA[1]] ? teamA[0] : teamA[1];
  const teamBHighPlayer = hole.netScores[teamB[0]] >= hole.netScores[teamB[1]] ? teamB[0] : teamB[1];
  const teamAHighNet = hole.netScores[teamAHighPlayer];
  const teamBHighNet = hole.netScores[teamBHighPlayer];
  const highResult: 'teamA' | 'teamB' | 'push' =
    teamAHighNet < teamBHighNet ? 'teamA' : teamBHighNet < teamAHighNet ? 'teamB' : 'push';

  // Summary
  const teamAWins = (lowResult === 'teamA' ? 1 : 0) + (highResult === 'teamA' ? 1 : 0);
  const teamBWins = (lowResult === 'teamB' ? 1 : 0) + (highResult === 'teamB' ? 1 : 0);
  let summary: string;
  if (teamAWins === 2) summary = `${teamA[0]} & ${teamA[1]} sweep — +2 each`;
  else if (teamBWins === 2) summary = `${teamB[0]} & ${teamB[1]} sweep — +2 each`;
  else if (teamAWins === 1 && teamBWins === 1) summary = 'Split — +1 each';
  else if (teamAWins === 1) summary = `${teamA[0]} & ${teamA[1]} win 1 — +1 each`;
  else if (teamBWins === 1) summary = `${teamB[0]} & ${teamB[1]} win 1 — +1 each`;
  else summary = 'Full push — no blood';

  return {
    lowBall: {
      teamAPlayer: teamALowPlayer,
      teamANet: teamALowNet,
      teamBPlayer: teamBLowPlayer,
      teamBNet: teamBLowNet,
      result: lowResult,
    },
    highBall: {
      teamAPlayer: teamAHighPlayer,
      teamANet: teamAHighNet,
      teamBPlayer: teamBHighPlayer,
      teamBNet: teamBHighNet,
      result: highResult,
    },
    summary,
  };
}

/**
 * Generates the default 3-segment pairings.
 * Canonical: [0,1], [0,2], [0,3] — player 0 is always on a team,
 * paired with a different player each segment.
 */
export function generateDefaultSegments(): [number, number][] {
  return [[0, 1], [0, 2], [0, 3]];
}

/**
 * Shuffles the segment order (Fisher-Yates).
 */
export function shuffleSegments(segments: [number, number][]): [number, number][] {
  const shuffled = [...segments];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
