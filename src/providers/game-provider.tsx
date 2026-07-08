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
import { getLatestWeekendId, getWeekendRounds, appendWeekendRound, removeWeekendRound, resetWeekend as resetWeekendRemote } from '@/lib/supabase/weekends';
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
  removeWeekendGame: (gameId: string) => void;
  updateWeekendGame: (game: Game) => void;
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

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  // Hydrate from localStorage + weekend rounds from Supabase on mount
  useEffect(() => {
    const active = loadActiveGame();
    setHasActiveGame(!!active);

    const savedSpectatorId = loadSpectatorGameId();
    setSpectatorGameId(savedSpectatorId);

    // Start with local weekend while we fetch shared weekend
    setWeekendGames(loadWeekendGames());

    (async () => {
      try {
        const weekendId = await getLatestWeekendId();
        const roundIds = await getWeekendRounds(weekendId);

        if (!roundIds.length) {
          setWeekendGames([]);
          return;
        }

        const { data, error } = await supabase
          .from('games')
          .select('state')
          .in('id', roundIds);

        if (error) throw error;

        const games = (data ?? [])
          .map((row: { state: Game }) => row.state)
          .filter(Boolean);

        // Preserve weekend order (Supabase IN doesn't guarantee order)
        const byId = new Map(games.map(g => [g.id, g]));
        const ordered = roundIds.map(id => byId.get(id)).filter(Boolean) as Game[];
        setWeekendGames(ordered);
      } catch (e) {
        console.error('[game-provider] Failed to hydrate weekend from Supabase:', e);
      }
    })();

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

  // Auto-save weekend whenever it changes (local cache)
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

    // Append to shared weekend (scorekeeper only)
    if (isScorekeeper) {
      (async () => {
        try {
          const weekendId = await getLatestWeekendId();
          await appendWeekendRound(weekendId, completedGame.id);
        } catch (e) {
          console.error('[game-provider] Failed to append round to weekend:', e);
        }
      })();
    }

    clearActiveGame();
    setHasActiveGame(false);
  }, [isScorekeeper]);

  const abandonGame = useCallback(() => {
    clearActiveGame();
    setGameState(null);
    setIsScorekeeper(false);
    setHasActiveGame(false);
  }, []);

  const resetWeekend = useCallback(() => {
    setWeekendGames([]);

    if (isScorekeeper) {
      (async () => {
        try {
          const weekendId = await getLatestWeekendId();
          await resetWeekendRemote(weekendId);
        } catch (e) {
          console.error('[game-provider] Failed to reset weekend in Supabase:', e);
        }
      })();
    }

    // saveWeekendGames([]) will be called by the existing effect
  }, [isScorekeeper]);

  const removeWeekendGame = useCallback((gameId: string) => {
    setWeekendGames(prev => prev.filter(g => g.id !== gameId));

    if (isScorekeeper) {
      (async () => {
        try {
          const weekendId = await getLatestWeekendId();
          await removeWeekendRound(weekendId, gameId);
        } catch (e) {
          console.error('[game-provider] Failed to remove round from weekend in Supabase:', e);
        }
      })();
    }
  }, [isScorekeeper]);

  const updateWeekendGame = useCallback((updatedGame: Game) => {
    setWeekendGames(prev => prev.map(g => (g.id === updatedGame.id ? updatedGame : g)));
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
      removeWeekendGame,
      updateWeekendGame,
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
