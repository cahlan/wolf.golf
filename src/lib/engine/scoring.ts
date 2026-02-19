import type { CompletedHole } from '../types/game';
import { LONE_WOLF_POINTS } from './constants';

export function calculateHolePoints(hole: CompletedHole): Record<string, number> {
  const points: Record<string, number> = {};
  hole.players.forEach((p) => (points[p] = 0));

  if (hole.loneWolf !== null) {
    return calculateLoneWolfPoints(hole);
  }

  const wolfTeam = [hole.wolf, hole.partner!];
  const otherTeam = hole.players.filter((p) => !wolfTeam.includes(p));

  const wolfBest = Math.min(...wolfTeam.map((p) => hole.netScores[p]));
  const otherBest = Math.min(...otherTeam.map((p) => hole.netScores[p]));

  if (wolfBest < otherBest) {
    wolfTeam.forEach((p) => (points[p] += 1));
  } else if (otherBest < wolfBest) {
    otherTeam.forEach((p) => (points[p] += 1));
  }

  return points;
}

export function calculateLoneWolfPoints(hole: CompletedHole): Record<string, number> {
  const points: Record<string, number> = {};
  hole.players.forEach((p) => (points[p] = 0));

  const wolfName = hole.wolf;
  const others = hole.players.filter((p) => p !== wolfName);
  const wolfScore = hole.netScores[wolfName];
  const bestOther = Math.min(...others.map((p) => hole.netScores[p]));

  if (wolfScore < bestOther) {
    points[wolfName] = LONE_WOLF_POINTS[hole.loneWolf!];
  } else if (wolfScore > bestOther) {
    others.forEach((p) => (points[p] = 1));
  }

  return points;
}
