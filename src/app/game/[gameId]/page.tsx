'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useGame } from '@/providers/game-provider';
import { supabase } from '@/lib/supabase/client';
import {
  calculateStandings,
  calculateSkins,
  getWolfForHole,
  getAllStrokesForHole,
  getPlayerStrokesOnHole,
} from '@/lib/engine';
import type { Game, HoleInput, LoneWolfType } from '@/lib/types/game';
import { LONE_WOLF_POINTS } from '@/lib/engine/constants';
import { Button, Fade, Label, BottomSheet } from '@/components/ui';
import { HoleInputFlow } from '@/components/game/hole-input-flow';
import { StandingsView } from '@/components/game/standings-view';
import { SkinsView } from '@/components/game/skins-view';
import { LastHoleResult } from '@/components/game/last-hole-result';
import { StandingsToggleCard } from '@/components/game/standings-toggle-card';

export default function GamePage() {
  const router = useRouter();
  const params = useParams();
  const gameId = params.gameId as string;
  const { game: contextGame, setGame, isScorekeeper, isSpectator, spectateGame, leaveSpectator, completeRound, abandonGame } = useGame();

  // Local game state for spectators — separate from context to avoid the isSpectator/join dance
  const [localGame, setLocalGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(false);
  const [watcherCount, setWatcherCount] = useState(0);

  // Determine effective game: scorekeeper uses context game, everyone else uses local
  const game = isScorekeeper ? contextGame : (localGame ?? contextGame);
  const isEffectiveSpectator = !isScorekeeper;

  // Fetch from Supabase for non-scorekeepers (on mount, or if no game in context)
  useEffect(() => {
    if (isScorekeeper || hasFetched.current) return;
    hasFetched.current = true;
    setLoading(true);
    supabase
      .from('games')
      .select('state')
      .eq('id', gameId)
      .single()
      .then(({ data }) => {
        if (data?.state) {
          setLocalGame(data.state as Game);
          // Also update context for backwards compat (join page, home screen, etc.)
          spectateGame(data.state as Game);
        }
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, isScorekeeper]);

  // Realtime subscription — owned by GamePage for spectators, not the provider
  useEffect(() => {
    if (isScorekeeper) return; // scorekeeper doesn't need this

    console.log('[realtime] Setting up subscription for game:', gameId);

    const channel = supabase
      .channel(`game-spectator-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          console.log('[realtime] Received UPDATE payload:', payload);
          const newState = (payload.new as { state: Game }).state;
          if (newState) {
            setLocalGame(newState);
            setGame(newState); // keep context in sync
          } else {
            console.warn('[realtime] payload.new.state was undefined — check REPLICA IDENTITY FULL');
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[realtime] Subscription status:', status, err ?? '');
      });

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, isScorekeeper]);

  // Supabase Realtime presence — track how many clients are viewing this game
  useEffect(() => {
    if (!game) return;
    const channel = supabase.channel(`presence-game-${gameId}`, {
      config: { presence: { key: crypto.randomUUID() } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const count = Object.keys(channel.presenceState()).length;
        setWatcherCount(count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ joined_at: Date.now() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, game?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <span className="text-wolf-text-muted font-mono text-sm">Loading game...</span>
      </div>
    );
  }

  if (!game) {
    // Don't redirect immediately — wait a beat for the fetch
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <span className="text-wolf-text-muted font-mono text-sm">Loading game...</span>
      </div>
    );
  }

  return (
    <GameView
      game={game}
      setGame={isScorekeeper ? setGame : setLocalGame}
      isScorekeeper={isScorekeeper}
      isSpectator={isEffectiveSpectator}
      completeRound={completeRound}
      abandonGame={abandonGame}
      leaveSpectator={leaveSpectator}
      watcherCount={watcherCount}
    />
  );
}

function GameView({
  game,
  setGame,
  isScorekeeper,
  isSpectator,
  completeRound,
  abandonGame,
  leaveSpectator,
  watcherCount,
}: {
  game: Game;
  setGame: (g: Game | null) => void;
  isScorekeeper: boolean;
  isSpectator: boolean;
  completeRound: (gameOverride?: Game) => void;
  abandonGame: () => void;
  leaveSpectator: () => void;
  watcherCount: number;
}) {
  const router = useRouter();
  const startHole = game.startingHole ?? 1;
  const [currentHole, setCurrentHole] = useState(() => startHole + game.holes.length);
  const [tab, setTab] = useState<'play' | 'standings' | 'skins'>('play');
  const [copied, setCopied] = useState(false);
  const [holeInput, setHoleInput] = useState<HoleInput | null>(null);
  const [editingHoleNum, setEditingHoleNum] = useState<number | null>(null);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [wolfDecision, setWolfDecision] = useState<{
    partner: string | null;
    loneWolf: LoneWolfType | null;
  } | null>(null);
  const [wolfPickerOpen, setWolfPickerOpen] = useState(true);

  // Reset wolf decision when hole changes
  useEffect(() => {
    setWolfDecision(null);
    setWolfPickerOpen(true);
  }, [currentHole]);

  // Keep spectators on the latest hole as scores come in
  useEffect(() => {
    if (isSpectator) {
      setCurrentHole(startHole + game.holes.length);
    }
  }, [isSpectator, game.holes.length, startHole]);

  const activeHoleNum = editingHoleNum || currentHole;

  const standings = useMemo(() => calculateStandings(game), [game]);
  const skinsData = useMemo(() => calculateSkins(game), [game]);
  const wolfIdx = activeHoleNum <= 18 ? getWolfForHole(game, activeHoleNum) : 0;
  const wolfName = game.players[wolfIdx];
  const holeInfo = activeHoleNum <= 18 ? game.course.holes[activeHoleNum - 1] : null;
  const strokesThisHole = activeHoleNum <= 18 ? getAllStrokesForHole(game, activeHoleNum) : {};

  // Players in order of play: non-wolf in tee rotation order, wolf always last
  const orderedPlayers = useMemo(() => {
    const nonWolfPlayers = game.players.filter(p => p !== wolfName);
    const rotation = (activeHoleNum - (game.startingHole ?? 1)) % nonWolfPlayers.length;
    return [
      ...nonWolfPlayers.slice(rotation),
      ...nonWolfPlayers.slice(0, rotation),
      wolfName,
    ];
  }, [game.players, wolfName, activeHoleNum, game.startingHole]);

  const beginHole = useCallback(() => {
    const gs: Record<string, string> = {};
    game.players.forEach(p => (gs[p] = ''));
    setEditingHoleNum(null);
    if (wolfDecision) {
      setHoleInput({
        holeNum: currentHole,
        wolf: wolfName,
        partner: wolfDecision.partner,
        loneWolf: wolfDecision.loneWolf,
        grossScores: gs,
        phase: 'scores',
      });
    } else {
      setHoleInput({
        holeNum: currentHole,
        wolf: wolfName,
        partner: null,
        loneWolf: null,
        grossScores: gs,
        phase: 'wolf-decision',
      });
    }
  }, [game.players, currentHole, wolfName, wolfDecision]);

  const editHole = useCallback((holeNum: number) => {
    const existingHole = game.holes.find(h => h.holeNum === holeNum);
    if (!existingHole) return;
    setEditingHoleNum(holeNum);
    setHoleInput({
      holeNum,
      wolf: existingHole.wolf,
      partner: existingHole.partner,
      loneWolf: existingHole.loneWolf,
      grossScores: Object.fromEntries(
        Object.entries(existingHole.grossScores).map(([k, v]) => [k, String(v)])
      ),
      phase: 'scores',
    });
  }, [game.holes]);

  function submitHole() {
    if (!holeInput) return;
    const hNum = holeInput.holeNum;
    const hi = game.course.holes[hNum - 1];

    const grossScores: Record<string, number> = {};
    const netScores: Record<string, number> = {};
    game.players.forEach(p => {
      const val = holeInput.grossScores[p];
      const gross = (val === '' || val === undefined) ? hi.par : (parseInt(val) || hi.par);
      grossScores[p] = gross;
      netScores[p] = gross - getPlayerStrokesOnHole(game, p, hNum);
    });

    const newHole = {
      holeNum: hNum,
      par: hi.par,
      strokeIndex: hi.strokeIndex,
      wolf: holeInput.wolf,
      partner: holeInput.partner,
      loneWolf: holeInput.loneWolf,
      players: game.players,
      grossScores,
      netScores,
    };

    let updatedHoles;
    if (editingHoleNum) {
      updatedHoles = game.holes.map(h => h.holeNum === hNum ? newHole : h);
    } else {
      updatedHoles = [...game.holes, newHole];
    }

    const updatedGame = { ...game, holes: updatedHoles };
    if (!editingHoleNum && currentHole >= 18) updatedGame.status = 'complete';

    setGame(updatedGame);
    setHoleInput(null);
    setEditingHoleNum(null);

    if (!editingHoleNum) {
      if (currentHole >= 18) {
        handleComplete(updatedGame);
      } else {
        setCurrentHole(currentHole + 1);
      }
    }
  }

  function handleComplete(finalGame?: Game) {
    completeRound(finalGame);
    router.push(`/game/${game.id}/settlement`);
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="py-3.5 px-5 pb-2.5 border-b border-wolf-border flex justify-between items-center">
        {isSpectator ? (
          <button
            onClick={() => { leaveSpectator(); router.push('/'); }}
            className="bg-transparent border-none text-wolf-text-sec text-sm cursor-pointer p-0 font-body"
          >
            &larr; Leave
          </button>
        ) : (
          <button
            onClick={() => setShowAbandonConfirm(true)}
            className="bg-transparent border-none text-wolf-text-sec text-sm cursor-pointer p-0 font-body"
          >
            &larr; Back
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="font-mono text-xs text-wolf-accent tracking-[2px]">
            {game.course.name.toUpperCase()} &middot; {game.id}
          </div>
          <button
            onClick={() => {
              const url = `${window.location.origin}/join?code=${game.id}`;
              navigator.clipboard.writeText(url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
            className="bg-transparent border border-wolf-border rounded px-1.5 py-0.5 text-[11px]
              font-mono text-wolf-text-muted cursor-pointer hover:border-wolf-accent hover:text-wolf-accent
              transition-colors"
            title="Copy spectator link"
          >
            {copied ? '✓ Copied' : '📋'}
          </button>
          {isSpectator && (
            <span className="text-[10px] font-mono bg-wolf-card border border-wolf-border text-wolf-text-muted py-0.5 px-1.5 rounded">
              SPECTATING
            </span>
          )}
          {watcherCount > 1 && (
            <span className="text-[10px] font-mono text-wolf-text-muted py-0.5 px-1.5">
              👀 {watcherCount}
            </span>
          )}
        </div>
      </div>

      {/* Abandon confirm (scorekeeper only) */}
      {!isSpectator && (
        <BottomSheet open={showAbandonConfirm} onClose={() => setShowAbandonConfirm(false)}>
          <div className="text-lg font-bold mb-2">Leave round?</div>
          <p className="text-wolf-text-sec text-sm mt-0 mb-5">
            Your progress is auto-saved. You can resume from the home screen.
          </p>
          <Button variant="primary" onClick={() => setShowAbandonConfirm(false)}>
            Keep Playing
          </Button>
          <Button onClick={() => { setShowAbandonConfirm(false); router.push('/'); }} className="mt-2">
            Leave (progress saved)
          </Button>
          <button
            onClick={() => {
              setShowAbandonConfirm(false);
              abandonGame();
              router.push('/');
            }}
            className="w-full py-2.5 bg-transparent border-none text-wolf-red text-[13px] cursor-pointer mt-2"
          >
            Abandon round permanently
          </button>
        </BottomSheet>
      )}

      {/* Tabs */}
      <div className="flex border-b border-wolf-border">
        {(['play', 'standings', ...(game.skinsEnabled !== false ? ['skins'] : [])] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t as typeof tab)}
            className={`flex-1 py-[11px] bg-transparent border-none font-mono text-[11px]
              tracking-[2px] cursor-pointer uppercase
              ${tab === t
                ? 'border-b-2 border-wolf-accent text-wolf-accent'
                : 'border-b-2 border-transparent text-wolf-text-muted'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* PLAY TAB */}
      {tab === 'play' && (
        <div className="py-3.5 px-5">
          {!holeInput ? (
            <Fade>
              {/* Hole navigation */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setCurrentHole(h => Math.max(startHole, h - 1))}
                  disabled={currentHole <= startHole}
                  className={`bg-transparent border border-wolf-border rounded-lg py-2 px-3.5
                    font-mono text-[13px] ${currentHole <= startHole ? 'text-wolf-text-muted opacity-30 cursor-default' : 'text-wolf-text cursor-pointer'}`}
                >
                  &larr; {currentHole > startHole ? currentHole - 1 : ''}
                </button>

                <div className="text-center">
                  <div className="text-xs text-wolf-text-muted font-mono mb-0.5">
                    {game.holes.some(h => h.holeNum === currentHole) ? 'COMPLETED' : currentHole <= 18 ? 'NEXT UP' : 'DONE'}
                  </div>
                  <div className="text-[44px] font-extrabold font-display tracking-[-3px]">
                    {currentHole <= 18 ? currentHole : '✓'}
                  </div>
                  {holeInfo && (
                    <div className="inline-flex gap-2.5 text-[13px] font-mono text-wolf-text-sec mt-0.5">
                      <span>Par {holeInfo.par}</span>
                      <span className="text-wolf-border">&middot;</span>
                      <span>SI {holeInfo.strokeIndex}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setCurrentHole(h => Math.min(startHole + game.holes.length, Math.min(19, h + 1)))}
                  disabled={currentHole > 18 || currentHole > game.holes.length + startHole - 1}
                  className={`bg-transparent border border-wolf-border rounded-lg py-2 px-3.5
                    font-mono text-[13px] ${(currentHole > 18 || currentHole > game.holes.length + startHole - 1)
                      ? 'text-wolf-text-muted opacity-30 cursor-default' : 'text-wolf-text cursor-pointer'}`}
                >
                  {currentHole < 18 ? currentHole + 1 : ''} &rarr;
                </button>
              </div>

              {/* Wolf badge */}
              {currentHole <= 18 && (
                <div className="flex items-center justify-center gap-2 py-2 px-4 bg-wolf-orange-bg
                  rounded-[20px] border border-wolf-orange/20 mb-4 w-fit mx-auto">
                  <span className="text-lg">🐺</span>
                  <span className="text-wolf-orange font-bold text-base">{wolfName}</span>
                  {currentHole >= (game.lastPlaceWolfStartHole ?? 17) && (
                    <span className="text-[10px] text-wolf-red font-mono bg-wolf-red-bg py-0.5 px-1.5 rounded">
                      LAST PLACE
                    </span>
                  )}
                </div>
              )}

              {/* WHO POPS */}
              {currentHole <= 18 && (
                <div className="bg-wolf-card rounded-xl border border-wolf-border p-3.5 mb-4">
                  <Label className="mb-2">WHO POPS THIS HOLE</Label>
                  {orderedPlayers.map((p, idx) => {
                    const strokes = strokesThisHole[p];
                    const isWolf = p === wolfName;
                    return (
                      <div
                        key={p}
                        className={`flex items-center justify-between py-[7px]
                          ${idx !== 0 ? 'border-t border-wolf-border' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          {isWolf && <span className="text-sm">🐺</span>}
                          <span className={`text-[15px] ${isWolf ? 'font-bold text-wolf-orange' : 'text-wolf-text'}`}>
                            {p}
                          </span>
                          <span className="text-[11px] text-wolf-text-muted font-mono">
                            ({game.handicaps[p]} HC)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {strokes > 0 ? (
                            <>
                              {Array.from({ length: strokes }, (_, i) => (
                                <div key={i} className="w-2.5 h-2.5 rounded-full bg-wolf-accent" />
                              ))}
                              <span className="font-mono text-[13px] font-bold text-wolf-accent ml-0.5">
                                {strokes > 1 ? `${strokes} strokes` : '1 stroke'}
                              </span>
                            </>
                          ) : (
                            <span className="font-mono text-xs text-wolf-text-muted">&mdash;</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Inline wolf decision (scorekeeper only, next unscored hole) */}
              {isScorekeeper && currentHole === game.holes.length + 1 && currentHole <= 18 && (() => {
                const nonWolfPlayers = game.players.filter(p => p !== wolfName);
                const rotation = (currentHole - (game.startingHole ?? 1)) % nonWolfPlayers.length;
                const otherPlayers = [
                  ...nonWolfPlayers.slice(rotation),
                  ...nonWolfPlayers.slice(0, rotation),
                ];

                if (wolfDecision && !wolfPickerOpen) {
                  // Collapsed summary row
                  const summaryText = wolfDecision.partner
                    ? `Partner: ${wolfDecision.partner}`
                    : wolfDecision.loneWolf === 'early'
                      ? `Lone Wolf: Before Drives +${LONE_WOLF_POINTS.early}`
                      : wolfDecision.loneWolf === 'late'
                        ? `Lone Wolf: After Drives +${LONE_WOLF_POINTS.late}`
                        : `Lone Wolf: Default +${LONE_WOLF_POINTS.default}`;
                  return (
                    <div className="bg-wolf-card rounded-xl border border-wolf-border p-3.5 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[15px]">
                          <span>🐺</span>
                          <span className="font-semibold text-wolf-text">{summaryText}</span>
                        </div>
                        <button
                          onClick={() => setWolfPickerOpen(true)}
                          className="bg-transparent border-none text-wolf-accent text-[13px] font-semibold cursor-pointer p-0"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  );
                }

                // Full picker
                return (
                  <div className="bg-wolf-card rounded-xl border border-wolf-border p-3.5 mb-4">
                    <Label className="mb-2.5">WOLF&apos;S CALL</Label>

                    {/* Partner buttons */}
                    <div className="flex gap-2 mb-2.5 flex-wrap">
                      {otherPlayers.map(p => {
                        const strokes = strokesThisHole[p] || 0;
                        const isSelected = wolfDecision?.partner === p;
                        return (
                          <button
                            key={p}
                            onClick={() => {
                              setWolfDecision({ partner: p, loneWolf: null });
                              setWolfPickerOpen(false);
                            }}
                            className={`flex-1 min-w-0 py-2.5 px-3 rounded-full border font-body text-[14px] font-medium cursor-pointer
                              flex items-center justify-center gap-1.5
                              ${isSelected
                                ? 'bg-wolf-accent text-wolf-bg border-wolf-accent'
                                : 'bg-wolf-bg border-wolf-border text-wolf-text hover:border-wolf-accent/50'}`}
                          >
                            <span className="truncate">{p}</span>
                            {strokes > 0 && (
                              <span className="inline-flex gap-0.5 flex-shrink-0">
                                {Array.from({ length: strokes }, (_, i) => (
                                  <span key={i} className="w-[6px] h-[6px] rounded-full bg-wolf-accent inline-block" />
                                ))}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Lone wolf buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {([
                        { type: 'early' as const, label: '🐺 Lone Before', pts: LONE_WOLF_POINTS.early },
                        { type: 'late' as const, label: 'Lone After', pts: LONE_WOLF_POINTS.late },
                        { type: 'default' as const, label: 'Default Lone', pts: LONE_WOLF_POINTS.default },
                      ]).map(opt => {
                        const isSelected = wolfDecision?.loneWolf === opt.type;
                        return (
                          <button
                            key={opt.type}
                            onClick={() => {
                              setWolfDecision({ partner: null, loneWolf: opt.type });
                              setWolfPickerOpen(false);
                            }}
                            className={`flex-1 min-w-0 py-2 px-2 rounded-full border text-[12px] font-mono font-semibold cursor-pointer
                              ${isSelected
                                ? 'bg-wolf-orange text-wolf-bg border-wolf-orange'
                                : 'bg-wolf-orange-bg border-wolf-orange/20 text-wolf-orange hover:border-wolf-orange/50'}`}
                          >
                            {opt.label} +{opt.pts}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Quick standings (with optional skins tab) */}
              <StandingsToggleCard game={game} standings={standings} skinsData={skinsData} />

              {/* Viewing a completed hole */}
              {game.holes.some(h => h.holeNum === currentHole) && (
                <div className="mb-4">
                  <LastHoleResult hole={game.holes.find(h => h.holeNum === currentHole)!} />
                  {isScorekeeper && (
                    <Button onClick={() => editHole(currentHole)} className="mt-2">
                      ✎ Edit Hole {currentHole}
                    </Button>
                  )}
                </div>
              )}

              {/* Score next hole button */}
              {isScorekeeper && currentHole === startHole + game.holes.length && currentHole <= 18 && (
                <Button variant="primary" onClick={beginHole}>
                  Score Hole {currentHole}
                </Button>
              )}
              {game.holes.length >= (19 - startHole) && (
                <Button variant="primary" onClick={() => handleComplete()} className="mt-2">
                  View Settlement &rarr;
                </Button>
              )}
            </Fade>
          ) : (
            <>
              {editingHoleNum && (
                <div className="bg-wolf-orange-bg rounded-lg border border-wolf-orange/20
                  py-2 px-3 mb-3 flex items-center justify-between">
                  <span className="text-[13px] text-wolf-orange font-semibold">
                    ✎ Editing Hole {editingHoleNum}
                  </span>
                  <button
                    onClick={() => { setHoleInput(null); setEditingHoleNum(null); }}
                    className="bg-transparent border-none text-wolf-text-sec text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <HoleInputFlow
                game={game}
                holeInput={holeInput}
                setHoleInput={setHoleInput}
                onSubmit={submitHole}
                onCancel={() => { setHoleInput(null); setEditingHoleNum(null); }}
                strokesThisHole={editingHoleNum ? getAllStrokesForHole(game, editingHoleNum) : strokesThisHole}
                holeInfo={(editingHoleNum ? game.course.holes[editingHoleNum - 1] : holeInfo)!}
              />
            </>
          )}
        </div>
      )}

      {tab === 'standings' && (
        <div className="py-3.5 px-5">
          <StandingsView game={game} standings={standings} />
        </div>
      )}

      {tab === 'skins' && (
        <div className="py-3.5 px-5">
          <SkinsView game={game} skinsData={skinsData} />
        </div>
      )}
    </div>
  );
}
