import { supabase } from './client';
import type { Game } from '@/lib/types/game';

/**
 * Fetch a single game's full state by id (the 5-letter join code).
 * Returns null when the game doesn't exist or the read fails — callers decide
 * how to handle absence (redirect, show "not found", keep waiting, …).
 */
export async function fetchGameState(gameId: string): Promise<Game | null> {
  const { data } = await supabase
    .from('games')
    .select('state')
    .eq('id', gameId)
    .single();
  return (data?.state as Game) ?? null;
}

/**
 * Upsert a game's state (scorekeeper writes only). Fire-and-forget: resolves
 * once the write completes and logs on failure rather than throwing, so callers
 * in effects/handlers don't need their own try/catch.
 */
export async function upsertGameState(game: Game): Promise<void> {
  const { error } = await supabase
    .from('games')
    .upsert({ id: game.id, state: game, updated_at: new Date().toISOString() });
  if (error) console.error('[supabase] Failed to sync game to Supabase:', error.message);
}
