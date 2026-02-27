'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/providers/game-provider';
import { calculateWeekendStandings, calculateStandings, WEEKEND_PLACEMENT_POINTS } from '@/lib/engine';
import type { Game } from '@/lib/types/game';
import { supabase } from '@/lib/supabase/client';
import { BackButton, Button, Fade, Label, BottomSheet } from '@/components/ui';

function formatRoundLabel(game: Game, index: number) {
  const course = game?.course?.name ? ` · ${game.course.name}` : '';
  return `Round ${index + 1}${course}`;
}

export default function WeekendPage() {
  const router = useRouter();
  const { weekendGames, resetWeekend, removeWeekendGame, updateWeekendGame } = useGame();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [removeGameId, setRemoveGameId] = useState<string | null>(null);

  const [editGameId, setEditGameId] = useState<string | null>(null);
  const editingGame = weekendGames.find(g => g.id === editGameId) ?? null;
  const [placementsDraft, setPlacementsDraft] = useState<Record<string, number>>({});

  const weekendStandings = calculateWeekendStandings(weekendGames);

  return (
    <div className="px-5 pt-4 pb-10">
      <BackButton href="/" />
      <Fade>
        <div className="text-center mb-6">
          <div className="text-xs font-mono text-wolf-gold tracking-[3px] mb-1.5">
            🏆 WEEKEND
          </div>
          <h1 className="text-[34px] font-extrabold font-display m-0 tracking-tight">
            Overall Standings
          </h1>
          <p className="text-wolf-text-sec text-sm mt-1.5">
            {weekendGames.length} round{weekendGames.length !== 1 ? 's' : ''} played
          </p>
        </div>

        {weekendStandings.length === 0 ? (
          <div className="text-center text-wolf-text-muted py-10">No rounds completed yet.</div>
        ) : (
          weekendStandings.map((s, i) => {
            const bgColors = ['bg-wolf-gold', 'bg-wolf-silver', 'bg-wolf-bronze', 'bg-wolf-hover'];
            const textColors = [
              'text-wolf-bg', 'text-wolf-bg', 'text-wolf-bg', 'text-wolf-text-sec',
            ];
            return (
              <div
                key={s.name}
                className={`flex items-center p-4 rounded-xl mb-2 border
                  ${i === 0
                    ? 'bg-gradient-to-br from-wolf-gold/7 to-wolf-gold/2 border-wolf-gold/25'
                    : 'bg-wolf-card border-wolf-border'}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center
                  font-extrabold font-mono text-base mr-3.5
                  ${bgColors[i] || 'bg-wolf-hover'} ${textColors[i] || 'text-wolf-text-sec'}`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-[17px]">{s.name}</div>
                </div>
                <div className={`font-mono text-[28px] font-extrabold
                  ${i === 0 ? 'text-wolf-gold' : 'text-wolf-text'}`}>
                  {s.points}
                </div>
              </div>
            );
          })
        )}

        {weekendGames.length > 0 && (
          <div className="mt-5">
            <Label className="mb-2">ROUND RESULTS</Label>
            {weekendGames.map((game, gi) => {
              const standings = calculateStandings(game);
              const placementOverride = game.weekendPlacementOverride ?? {};
              return (
                <div
                  key={game.id}
                  className="bg-wolf-card border border-wolf-border rounded-[10px] p-3.5 mb-2"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="text-[13px] font-mono text-wolf-text-sec">
                        {formatRoundLabel(game, gi)}
                      </div>
                      <span className="text-[10px] bg-wolf-card border border-wolf-border py-0.5 px-1.5 rounded text-wolf-text-sec">
                        {(game.gameType ?? 'wolf') === 'six' ? '6x6x6' : 'Wolf'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="mini"
                        aria-label={`Edit weekend placements for ${formatRoundLabel(game, gi)}`}
                        onClick={() => {
                          setEditGameId(game.id);
                          setPlacementsDraft({ ...(game.weekendPlacementOverride ?? {}) });
                        }}
                        title="Edit weekend placements"
                      >
                        ✎
                      </Button>
                      <Button
                        variant="mini"
                        aria-label={`Remove ${formatRoundLabel(game, gi)} from weekend`}
                        onClick={() => setRemoveGameId(game.id)}
                        title="Remove round"
                      >
                        ×
                      </Button>
                    </div>
                  </div>

                  {standings.map((s, i) => (
                    <div
                      key={s.name}
                      className={`flex justify-between text-sm py-[3px]
                        ${i === 0 ? 'text-wolf-accent' : 'text-wolf-text'}`}
                    >
                      <span>{i + 1}. {s.name}</span>
                      <span className="font-mono">
                        {s.points > 0 ? '+' : ''}{s.points} pts &rarr; {WEEKEND_PLACEMENT_POINTS[(Math.max(1, placementOverride[s.name] ?? (i + 1)) - 1)] ?? 0} wknd
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
        {weekendGames.length > 0 && (
          <div className="mt-8">
            <Button onClick={() => setShowResetConfirm(true)}>
              Start Fresh Weekend
            </Button>
          </div>
        )}

        <BottomSheet open={showResetConfirm} onClose={() => setShowResetConfirm(false)}>
          <div className="text-lg font-bold mb-2">Start fresh?</div>
          <p className="text-wolf-text-sec text-sm mt-0 mb-5">
            This will clear all games from this weekend. Are you sure?
          </p>
          <Button variant="primary" onClick={() => setShowResetConfirm(false)}>
            Keep Weekend
          </Button>
          <button
            onClick={() => {
              setShowResetConfirm(false);
              resetWeekend();
              router.push('/');
            }}
            className="w-full py-2.5 bg-transparent border-none text-wolf-red text-[13px] cursor-pointer mt-2"
          >
            Clear all games and start fresh
          </button>
        </BottomSheet>

        <BottomSheet open={!!editGameId} onClose={() => setEditGameId(null)}>
          <div className="text-lg font-bold mb-2">Edit weekend placements</div>
          <p className="text-wolf-text-sec text-sm mt-0 mb-5">
            Use this to break ties / override who gets weekend placement points for this round.
          </p>

          {editingGame && (
            <div className="space-y-3">
              {editingGame.players.map((p) => {
                const value = placementsDraft[p] ?? 0;
                return (
                  <div key={p} className="flex items-center justify-between gap-3">
                    <div className="font-bold text-wolf-text">{p}</div>
                    <input
                      type="number"
                      min={0}
                      max={editingGame.players.length}
                      value={value}
                      onChange={(e) => {
                        const v = parseInt(e.target.value) || 0;
                        setPlacementsDraft(prev => ({ ...prev, [p]: v }));
                      }}
                      className="w-20 text-lg font-mono text-center bg-wolf-card border border-wolf-border
                        rounded-[10px] py-2 px-2 text-wolf-text outline-none"
                    />
                  </div>
                );
              })}

              <div className="text-[12px] text-wolf-text-muted">
                Enter 1-4 to set placement. Use the same number for ties. Use 0 to clear an override.
              </div>

              <Button
                variant="primary"
                onClick={async () => {
                  if (!editingGame) return;

                  // Clean draft: keep only valid 1..N entries
                  const n = editingGame.players.length;
                  const cleaned: Record<string, number> = {};
                  Object.entries(placementsDraft).forEach(([name, placement]) => {
                    if (typeof placement === 'number' && placement >= 1 && placement <= n) cleaned[name] = placement;
                  });

                  const updated: Game = {
                    ...editingGame,
                    weekendPlacementOverride: Object.keys(cleaned).length ? cleaned : undefined,
                  };

                  // Optimistic local update
                  updateWeekendGame(updated);

                  // Persist to Supabase
                  const { error } = await supabase
                    .from('games')
                    .upsert({ id: updated.id, state: updated, updated_at: new Date().toISOString() });

                  if (error) {
                    console.error('[weekend] Failed to sync weekend placement override:', error.message);
                  }

                  setEditGameId(null);
                }}
              >
                Save placements
              </Button>

              <Button
                onClick={() => {
                  if (!editingGame) return;
                  setPlacementsDraft({});
                }}
              >
                Clear overrides
              </Button>
            </div>
          )}
        </BottomSheet>

        <BottomSheet open={!!removeGameId} onClose={() => setRemoveGameId(null)}>
          <div className="text-lg font-bold mb-2">Remove round?</div>
          <p className="text-wolf-text-sec text-sm mt-0 mb-5">
            This will remove this round from the weekend standings on this device.
          </p>
          <Button variant="primary" onClick={() => setRemoveGameId(null)}>
            Keep Round
          </Button>
          <button
            onClick={() => {
              if (!removeGameId) return;
              removeWeekendGame(removeGameId);
              setRemoveGameId(null);
            }}
            className="w-full py-2.5 bg-transparent border-none text-wolf-red text-[13px] cursor-pointer mt-2"
          >
            Remove round from weekend
          </button>
        </BottomSheet>
      </Fade>
    </div>
  );
}
