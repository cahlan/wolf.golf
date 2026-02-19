'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { Game } from '@/lib/types/game';
import {
  saveActiveGame,
  loadActiveGame,
  clearActiveGame,
  saveWeekendGames,
  loadWeekendGames,
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
  hasActiveGame: boolean;
  resumeGame: () => Game | null;
  spectateGame: (game: Game) => void;
  leaveSpectator: () => void;
  completeRound: (gameOverride?: Game) => void;
  abandonGame: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [game, setGameState] = useState<Game | null>(null);
  const [weekendGames, setWeekendGames] = useState<Game[]>([]);
  const [isScorekeeper, setIsScorekeeper] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [hasActiveGame, setHasActiveGame] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const gameRef = useRef(game);
  gameRef.current = game;

  // Hydrate from localStorage on mount
  useEffect(() => {
    const active = loadActiveGame();
    setHasActiveGame(!!active);
    setWeekendGames(loadWeekendGames());
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
        .then();
    }
  }, [game, hydrated, isScorekeeper]);

  // Auto-save weekend whenever it changes
  useEffect(() => {
    if (!hydrated) return;
    saveWeekendGames(weekendGames);
  }, [weekendGames, hydrated]);

  // Track game ID in a ref so the realtime channel isn't torn down on every game state update
  const gameIdRef = useRef<string | undefined>(game?.id);
  useEffect(() => {
    if (game?.id) gameIdRef.current = game.id;
  }, [game?.id]);

  // Realtime subscription for spectators — only re-subscribe when isSpectator changes,
  // not on every game state update (which would tear down & recreate the channel, causing flashes).
  useEffect(() => {
    if (!isSpectator || !gameIdRef.current) return;
    const gameId = gameIdRef.current;
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const newState = (payload.new as { state: Game }).state;
          setGameState(newState);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpectator]);

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
  }, []);

  const leaveSpectator = useCallback(() => {
    setGameState(null);
    setIsSpectator(false);
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

  return (
    <GameContext.Provider value={{
      game,
      setGame,
      weekendGames,
      setWeekendGames,
      isScorekeeper,
      setIsScorekeeper,
      isSpectator,
      hasActiveGame,
      resumeGame,
      spectateGame,
      leaveSpectator,
      completeRound,
      abandonGame,
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
