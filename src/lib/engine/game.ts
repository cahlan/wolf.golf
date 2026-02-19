import type { CreateGameParams, Game } from '../types/game';

export function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function createGame(params: CreateGameParams): Game {
  return {
    id: generateCode(),
    createdAt: Date.now(),
    players: params.players,
    buyIn: params.buyIn,
    handicaps: params.handicaps,
    wolfOrder: params.wolfOrder,
    skinsEnabled: params.skinsEnabled,
    skinsValue: params.skinsValue,
    course: params.course,
    holes: [],
    status: 'active',
    weekendId: null,
    lastPlaceWolf: params.lastPlaceWolf,
    lastPlaceWolfStartHole: params.lastPlaceWolfStartHole,
    payoutStructure: params.payoutStructure,
    skinsCarryover: params.skinsCarryover,
  };
}
