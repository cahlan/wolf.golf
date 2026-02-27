// ============================================================================
// Supabase Weekend Storage
// ============================================================================
//
// Run in Supabase SQL editor:
//
// create table weekends (
//   id uuid primary key default gen_random_uuid(),
//   created_at timestamptz default now(),
//   updated_at timestamptz default now(),
//   rounds text[] not null default '{}'
// );
//
// alter table weekends enable row level security;
// create policy "Public read" on weekends for select using (true);
// create policy "Public write" on weekends for insert with check (true);
// create policy "Public update" on weekends for update using (true);
// create policy "Public delete" on weekends for delete using (true);
//
// Note: This is intentionally open RLS for now (same as courses).
// ============================================================================

import { supabase } from '@/lib/supabase/client';

export interface WeekendRow {
  id: string;
  rounds: string[];
  created_at?: string;
  updated_at?: string;
}

export async function getLatestWeekendId(): Promise<string> {
  const { data, error } = await supabase
    .from('weekends')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (data?.id) return data.id as string;

  // Create first weekend
  const { data: created, error: createErr } = await supabase
    .from('weekends')
    .insert({ rounds: [], updated_at: new Date().toISOString() })
    .select('id')
    .single();

  if (createErr) throw createErr;
  return created.id as string;
}

export async function getWeekendRounds(weekendId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('weekends')
    .select('rounds')
    .eq('id', weekendId)
    .single();

  if (error) throw error;
  return (data?.rounds ?? []) as string[];
}

export async function updateWeekendRounds(weekendId: string, rounds: string[]): Promise<void> {
  const { error } = await supabase
    .from('weekends')
    .update({ rounds, updated_at: new Date().toISOString() })
    .eq('id', weekendId);

  if (error) throw error;
}

export async function appendWeekendRound(weekendId: string, gameId: string): Promise<void> {
  const current = await getWeekendRounds(weekendId);
  if (current.includes(gameId)) return;
  await updateWeekendRounds(weekendId, [...current, gameId]);
}

export async function removeWeekendRound(weekendId: string, gameId: string): Promise<void> {
  const current = await getWeekendRounds(weekendId);
  await updateWeekendRounds(weekendId, current.filter(id => id !== gameId));
}

export async function resetWeekend(weekendId: string): Promise<void> {
  await updateWeekendRounds(weekendId, []);
}
