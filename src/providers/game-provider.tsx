'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { Game } from '@/lib/types/game';
import {
  saveActiveGame,
  loadActiveGame,
  clearActiveGame,
  saveWeekendGames,
  loadWeekendGames,
  saveSpectatorGameId,
  loadSpectatorGameId,
  clearSpectatorGameId,
} from '@/lib/storage/local';
import { supabase } from '@/lib/supabase/client';

interface GameContextValue {
  game: Game | null;
  setGame: (game: Game | null) => void;
  weekendGames: Game[];
  setWeekendGames: React.Dispatch<React.SetStateAction<Game[]>>;
  isScorekeeper: boolean;
  setIsScorekeeper: (v: boolean) => void;
  isSpectator: boolean;
  spectatorGameId: string | null;
  hasActiveGame: boolean;
  resumeGame: () => Game | null;
  spectateGame: (game: Game) => void;
  leaveSpectator: () => void;
  completeRound: (gameOverride?: Game) => void;
  abandonGame: () => void;
  resetWeekend: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [game, setGameState] = useState<Game | null>(null);
  const [weekendGames, setWeekendGames] = useState<Game[]>([]);
  const [isScorekeeper, setIsScorekeeper] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [spectatorGameId, setSpectatorGameId] = useState<string | null>(null);
  const [hasActiveGame, setHasActiveGame] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const gameRef = useRef(game);
  gameRef.current = game;

  // Hydrate from localStorage on mount
  useEffect(() => {
    const active = loadActiveGame();
    setHasActiveGame(!!active);
    setWeekendGames(loadWeekendGames());
    const savedSpectatorId = loadSpectatorGameId();
    setSpectatorGameId(savedSpectatorId);
    setHydrated(true);
  }, []);

  // Auto-save game whenever it changes (scorekeeper only)
  useEffect(() => {
    if (!hydrated || !isScorekeeper) return;
    if (game) {
      saveActiveGame(game);
      setHasActiveGame(true);
      supabase
        .from('games')
        .upsert({ id: game.id, state: game, updated_at: new Date().toISOString() })
        .then(({ error }) => {
          if (error) console.error('[game-provider] Failed to sync game to Supabase:', error.message);
        });
    }
  }, [game, hydrated, isScorekeeper]);

  // Auto-save weekend whenever it changes
  useEffect(() => {
    if (!hydrated) return;
    saveWeekendGames(weekendGames);
  }, [weekendGames, hydrated]);

  // Spectator realtime subscription is now handled directly in GamePage
  // (src/app/game/[gameId]/page.tsx) so it survives page refreshes without
  // depending on isSpectator context state.

  const setGame = useCallback((g: Game | null) => {
    setGameState(g);
    if (!g) setHasActiveGame(!!loadActiveGame());
  }, []);

  const resumeGame = useCallback((): Game | null => {
    const active = loadActiveGame();
    if (active) {
      setGameState(active);
      setIsScorekeeper(true);
      setIsSpectator(false);
    }
    return active;
  }, []);

  const spectateGame = useCallback((g: Game) => {
    setGameState(g);
    setIsScorekeeper(false);
    setIsSpectator(true);
    saveSpectatorGameId(g.id);
    setSpectatorGameId(g.id);
  }, []);

  const leaveSpectator = useCallback(() => {
    setGameState(null);
    setIsSpectator(false);
    clearSpectatorGameId();
    setSpectatorGameId(null);
  }, []);

  const completeRound = useCallback((gameOverride?: Game) => {
    const source = gameOverride ?? gameRef.current;
    if (!source) return;
    const completedGame = { ...source, status: 'complete' as const };
    setGameState(completedGame);
    setWeekendGames(prev => [...prev, completedGame]);
    clearActiveGame();
    setHasActiveGame(false);
  }, []);

  const abandonGame = useCallback(() => {
    clearActiveGame();
    setGameState(null);
    setIsScorekeeper(false);
    setHasActiveGame(false);
  }, []);

  const resetWeekend = useCallback(() => {
    setWeekendGames([]);
    // saveWeekendGames([]) will be called by the existing effect
  }, []);

  return (
    <GameContext.Provider value={{
      game,
      setGame,
      weekendGames,
      setWeekendGames,
      isScorekeeper,
      setIsScorekeeper,
      isSpectator,
      spectatorGameId,
      hasActiveGame,
      resumeGame,
      spectateGame,
      leaveSpectator,
      completeRound,
      abandonGame,
      resetWeekend,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
