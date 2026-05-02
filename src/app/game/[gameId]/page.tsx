'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useGame } from '@/providers/game-provider';
import { supabase } from '@/lib/supabase/client';
import {
  calculateStandings,
  calculateSkins,
  getWolfForHole,
  getAllStrokesForHole,
  getPlayerStrokesOnHole,
  getTeamsForHole,
  getTeeOrderForHole,
  courseHoleForRoundPos,
} from '@/lib/engine';
import type { Game, HoleInput, LoneWolfType } from '@/lib/types/game';
import { LONE_WOLF_POINTS } from '@/lib/engine/constants';
import { getSegmentForHole } from '@/lib/engine/six';
import { Button, Label, BottomSheet } from '@/components/ui';
import { HoleInputFlow } from '@/components/game/hole-input-flow';
import { SixHoleInput } from '@/components/game/six-hole-input';
import { ThreeTwoOneHoleInput } from '@/components/game/three-two-one-hole-input';
import { StandingsView } from '@/components/game/standings-view';
import { SkinsView } from '@/components/game/skins-view';
import { HoleResultDetail } from '@/components/game/hole-result-detail';
import { SixHoleResultDetail } from '@/components/game/six-hole-result';
import { ThreeTwoOneHoleResultDetail } from '@/components/game/three-two-one-hole-result';
import { StandingsToggleCard } from '@/components/game/standings-toggle-card';
import { ScorecardSheet } from '@/components/game/scorecard-sheet';

export default function GamePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const gameId = params.gameId as string;
  const { game: contextGame, setGame, isScorekeeper, isSpectator, spectateGame, leaveSpectator, completeRound, abandonGame, resumeGame, setIsScorekeeper } = useGame();

  // Local game state for spectators — separate from context to avoid the isSpectator/join dance
  const [localGame, setLocalGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(false);
  const [watcherCount, setWatcherCount] = useState(0);

  // Attempt to restore scorekeeper mode after refresh.
  // If the URL has ?keeper=1 OR we have an active game in localStorage matching this id,
  // set scorekeeper=true so we don't auto-join as spectator.
  useEffect(() => {
    if (isScorekeeper) return;

    const wantsKeeper = searchParams.get('keeper') === '1';
    const active = resumeGame();
    const canResumeThisGame = !!active && active.id === gameId;

    if (wantsKeeper || canResumeThisGame) {
      setIsScorekeeper(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

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
  // roundPos: 1-based position in the round (1 = first hole played, 18 = last)
  // courseHole: the actual course hole number (1-18), wrapping after 18
  const [roundPos, setRoundPos] = useState(() => game.holes.length + 1);
  const currentHole = courseHoleForRoundPos(startHole, roundPos);
  const roundComplete = game.holes.length >= 18;
  const [tab, setTab] = useState<'play' | 'standings' | 'skins'>('play');
  const [copied, setCopied] = useState(false);
  const [showScorecard, setShowScorecard] = useState(false);
  const [holeInput, setHoleInput] = useState<HoleInput | null>(null);
  const [editingHoleNum, setEditingHoleNum] = useState<number | null>(null);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  // Spectator update animation — pulse when game state changes via realtime
  const [updateKey, setUpdateKey] = useState(0);
  const prevGameRef = useRef({ holesLen: game.holes.length, pendingWolf: game.pendingWolfDecision });
  useEffect(() => {
    if (!isSpectator) return;
    const prev = prevGameRef.current;
    const changed = game.holes.length !== prev.holesLen || game.pendingWolfDecision !== prev.pendingWolf;
    if (changed) {
      setUpdateKey(k => k + 1);
    }
    prevGameRef.current = { holesLen: game.holes.length, pendingWolf: game.pendingWolfDecision };
  }, [isSpectator, game.holes.length, game.pendingWolfDecision]);

  // Clear pending wolf decision when hole changes (wolf only)
  useEffect(() => {
    if (!isSix && !isThreeTwoOne && isScorekeeper && game.pendingWolfDecision) {
      setGame({ ...game, pendingWolfDecision: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentHole]);

  // Keep spectators on the latest hole as scores come in
  useEffect(() => {
    if (isSpectator) {
      setRoundPos(game.holes.length + 1);
    }
  }, [isSpectator, game.holes.length]);

  const activeHoleNum = editingHoleNum || currentHole;
  // editingHoleNum is already a course hole number; currentHole is derived from roundPos
  const isSix = (game.gameType ?? 'wolf') === 'six';
  const isThreeTwoOne = game.gameType === 'three-two-one';
  const isWolfGame = !isSix && !isThreeTwoOne;

  const standings = useMemo(() => calculateStandings(game), [game]);
  const skinsData = useMemo(() => calculateSkins(game), [game]);
  const wolfIdx = isWolfGame ? getWolfForHole(game, activeHoleNum) : 0;
  const wolfName = game.players[wolfIdx];
  const holeInfo = game.course.holes[activeHoleNum - 1] ?? null;
  const strokesThisHole = getAllStrokesForHole(game, activeHoleNum);

  // 6x6x6: current teams for the active hole
  const sixTeams = useMemo(() => {
    if (!isSix) return null;
    return getTeamsForHole(game, activeHoleNum);
  }, [isSix, game, activeHoleNum]);

  // 6x6x6 / 3-2-1: gross scores state (separate from wolf's HoleInput)
  const [sixGrossScores, setSixGrossScores] = useState<Record<string, string>>({});
  const [threeTwoOneGrossScores, setThreeTwoOneGrossScores] = useState<Record<string, string>>({});

  // Sync wolf decision to game state so spectators see it in real-time
  const handleWolfDecision = useCallback((partner: string | null, loneWolf: LoneWolfType | null) => {
    if (isScorekeeper) {
      setGame({
        ...game,
        pendingWolfDecision: {
          holeNum: currentHole,
          wolf: wolfName,
          partner,
          loneWolf,
        },
      });
    }
  }, [isScorekeeper, game, currentHole, wolfName, setGame]);

  // Players in order of play (tee order): rotate based on who was wolf last hole; wolf always last.
  const orderedPlayers = useMemo(() => {
    return getTeeOrderForHole(game, activeHoleNum);
  }, [game, activeHoleNum]);

  const beginHole = useCallback(() => {
    const gs: Record<string, string> = {};
    game.players.forEach(p => (gs[p] = ''));
    setEditingHoleNum(null);

    if (isSix) {
      // 6x6x6: no wolf decision, go straight to scores
      setSixGrossScores(gs);
      setHoleInput({
        holeNum: currentHole,
        wolf: sixTeams?.teamA[0] ?? game.players[0],
        partner: sixTeams?.teamA[1] ?? game.players[1],
        loneWolf: null,
        grossScores: gs,
        phase: 'scores',
      });
    } else if (isThreeTwoOne) {
      // 3-2-1: no wolf decision, no teams, go straight to scores
      setThreeTwoOneGrossScores(gs);
      setHoleInput({
        holeNum: currentHole,
        wolf: game.players[0],
        partner: null,
        loneWolf: null,
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
  }, [game.players, currentHole, wolfName, isSix, isThreeTwoOne, sixTeams]);

  const editHole = useCallback((holeNum: number) => {
    const existingHole = game.holes.find(h => h.holeNum === holeNum);
    if (!existingHole) return;
    setEditingHoleNum(holeNum);
    const gs = Object.fromEntries(
      Object.entries(existingHole.grossScores).map(([k, v]) => [k, String(v)])
    );
    if (isSix) {
      setSixGrossScores(gs);
    } else if (isThreeTwoOne) {
      setThreeTwoOneGrossScores(gs);
    }
    setHoleInput({
      holeNum,
      wolf: existingHole.wolf,
      partner: existingHole.partner,
      loneWolf: existingHole.loneWolf,
      grossScores: gs,
      phase: 'scores',
    });
  }, [game.holes, isSix, isThreeTwoOne]);

  function submitHole() {
    if (!holeInput) return;
    const hNum = holeInput.holeNum;
    const hi = game.course.holes[hNum - 1];

    // For 6x6x6/3-2-1, use separate gross scores state; for wolf, use holeInput.grossScores
    const scoresSource = isSix ? sixGrossScores : isThreeTwoOne ? threeTwoOneGrossScores : holeInput.grossScores;

    const grossScores: Record<string, number> = {};
    const netScores: Record<string, number> = {};
    game.players.forEach(p => {
      const val = scoresSource[p];
      const gross = (val === '' || val === undefined) ? hi.par : (parseInt(val) || hi.par);
      grossScores[p] = gross;
      netScores[p] = gross - getPlayerStrokesOnHole(game, p, hNum);
    });

    // For 6x6x6: set wolf/partner from team assignments
    // For 3-2-1: set dummy values (not used in scoring)
    let holeWolf = holeInput.wolf;
    let holePartner = holeInput.partner;
    if (isSix) {
      const teams = getTeamsForHole(game, hNum);
      holeWolf = teams.teamA[0];
      holePartner = teams.teamA[1];
    } else if (isThreeTwoOne) {
      holeWolf = game.players[0];
      holePartner = null;
    }

    const newHole = {
      holeNum: hNum,
      par: hi.par,
      strokeIndex: hi.strokeIndex,
      wolf: holeWolf,
      partner: holePartner,
      loneWolf: (isSix || isThreeTwoOne) ? null : holeInput.loneWolf,
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

    const updatedGame = { ...game, holes: updatedHoles, pendingWolfDecision: null };
    if (!editingHoleNum && updatedHoles.length >= 18) updatedGame.status = 'complete';

    setGame(updatedGame);
    setHoleInput(null);
    setEditingHoleNum(null);

    if (!editingHoleNum) {
      if (updatedHoles.length >= 18) {
        handleComplete(updatedGame);
      } else {
        setRoundPos(p => p + 1);
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
            onClick={() => setShowScorecard(true)}
            className="bg-transparent border border-wolf-border rounded px-1.5 py-0.5 text-[11px]
              font-mono text-wolf-text-muted cursor-pointer hover:border-wolf-accent hover:text-wolf-accent
              transition-colors"
            title="Scorecard (gross/net by hole)"
          >
            ⛳
          </button>
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
          <ScorecardSheet game={game} open={showScorecard} onClose={() => setShowScorecard(false)} />
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
            <div
              key={isSpectator ? `spectator-${updateKey}` : 'scorekeeper'}
              className={isSpectator && updateKey > 0
                ? 'animate-[spectatorPulse_300ms_ease-out]'
                : 'animate-[fadeUp_0.2s_ease-out]'}
            >
              {/* Hole navigation */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setRoundPos(p => Math.max(1, p - 1))}
                  disabled={roundPos <= 1}
                  className={`bg-transparent border border-wolf-border rounded-lg py-2 px-3.5
                    font-mono text-[13px] ${roundPos <= 1 ? 'text-wolf-text-muted opacity-30 cursor-default' : 'text-wolf-text cursor-pointer'}`}
                >
                  &larr; {roundPos > 1 ? courseHoleForRoundPos(startHole, roundPos - 1) : ''}
                </button>

                <div className="text-center">
                  <div className="text-xs text-wolf-text-muted font-mono mb-0.5">
                    {game.holes.some(h => h.holeNum === currentHole) ? 'COMPLETED' : roundComplete ? 'DONE' : 'NEXT UP'}
                  </div>
                  <div className="text-[44px] font-extrabold font-display tracking-[-3px]">
                    {roundComplete && roundPos > game.holes.length ? '✓' : currentHole}
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
                  onClick={() => setRoundPos(p => Math.min(game.holes.length + 1, p + 1))}
                  disabled={roundPos > game.holes.length}
                  className={`bg-transparent border border-wolf-border rounded-lg py-2 px-3.5
                    font-mono text-[13px] ${roundPos > game.holes.length
                      ? 'text-wolf-text-muted opacity-30 cursor-default' : 'text-wolf-text cursor-pointer'}`}
                >
                  {roundPos <= game.holes.length ? courseHoleForRoundPos(startHole, roundPos + 1) : ''} &rarr;
                </button>
              </div>

              {/* Viewing a completed hole — show just the result detail */}
              {game.holes.some(h => h.holeNum === currentHole) ? (
                <div className="mb-4">
                  {isSix ? (
                    <SixHoleResultDetail game={game} hole={game.holes.find(h => h.holeNum === currentHole)!} />
                  ) : isThreeTwoOne ? (
                    <ThreeTwoOneHoleResultDetail game={game} hole={game.holes.find(h => h.holeNum === currentHole)!} />
                  ) : (
                    <HoleResultDetail game={game} hole={game.holes.find(h => h.holeNum === currentHole)!} />
                  )}
                  {isScorekeeper && (
                    <Button onClick={() => editHole(currentHole)} className="mt-2">
                      ✎ Edit Hole {currentHole}
                    </Button>
                  )}
                </div>
              ) : isSix ? (
                <>
                  {/* 6x6x6: Team matchup card */}
                  {sixTeams && (
                    <>
                      <div className="text-center mb-3">
                        <span className="text-[11px] font-mono text-wolf-accent tracking-[1.5px]">
                          HOLES {getSegmentForHole(currentHole) * 6 + 1}–{(getSegmentForHole(currentHole) + 1) * 6}
                        </span>
                      </div>

                      <div className="bg-wolf-accent-bg rounded-xl border border-wolf-accent/20 p-3.5 mb-3">
                        <div className="text-xs font-mono text-wolf-accent font-semibold tracking-[1.5px] mb-2">
                          TEAM A
                        </div>
                        {sixTeams.teamA.map(p => {
                          const strokes = strokesThisHole[p] || 0;
                          return (
                            <div key={p} className="flex items-center justify-between py-[5px]">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[15px] text-wolf-text font-medium">{p}</span>
                                <span className="text-[11px] text-wolf-text-muted font-mono">({game.handicaps[p]} HC)</span>
                              </div>
                              {strokes > 0 && (
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: strokes }, (_, i) => (
                                    <div key={i} className="w-2 h-2 rounded-full bg-wolf-accent" />
                                  ))}
                                  <span className="font-mono text-xs font-bold text-wolf-accent ml-0.5">
                                    {strokes > 1 ? `${strokes}` : '1'}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="text-center py-1 mb-3 relative">
                        <div className="absolute top-1/2 left-0 right-0 border-t border-wolf-border" />
                        <span className="relative bg-wolf-bg px-3.5 text-xs font-mono text-wolf-text-muted font-semibold tracking-[2px]">
                          VS
                        </span>
                      </div>

                      <div className="bg-wolf-card rounded-xl border border-wolf-border p-3.5 mb-3">
                        <div className="text-xs font-mono text-wolf-text-sec font-semibold tracking-[1.5px] mb-2">
                          TEAM B
                        </div>
                        {sixTeams.teamB.map(p => {
                          const strokes = strokesThisHole[p] || 0;
                          return (
                            <div key={p} className="flex items-center justify-between py-[5px]">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[15px] text-wolf-text font-medium">{p}</span>
                                <span className="text-[11px] text-wolf-text-muted font-mono">({game.handicaps[p]} HC)</span>
                              </div>
                              {strokes > 0 && (
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: strokes }, (_, i) => (
                                    <div key={i} className="w-2 h-2 rounded-full bg-wolf-accent" />
                                  ))}
                                  <span className="font-mono text-xs font-bold text-wolf-accent ml-0.5">
                                    {strokes > 1 ? `${strokes}` : '1'}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  <StandingsToggleCard game={game} standings={standings} skinsData={skinsData} />
                </>
              ) : isThreeTwoOne ? (
                <>
                  {/* 3-2-1: Player info card */}
                  <div className="bg-wolf-card rounded-xl border border-wolf-border p-3.5 mb-4">
                      <Label className="mb-2">PLAYERS</Label>
                      {game.players.map((p, idx) => {
                        const strokes = strokesThisHole[p] || 0;
                        return (
                          <div
                            key={p}
                            className={`flex items-center justify-between py-[7px]
                              ${idx !== 0 ? 'border-t border-wolf-border' : ''}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[15px] text-wolf-text">{p}</span>
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

                  <StandingsToggleCard game={game} standings={standings} skinsData={skinsData} />
                </>
              ) : (
                <>
                  {/* Spectator: pending wolf decision — show ScoresPhase-style team layout */}
                  {isSpectator && game.pendingWolfDecision?.holeNum === currentHole ? (() => {
                    const d = game.pendingWolfDecision;
                    const isLone = !!d.loneWolf;
                    const wolfTeam = isLone ? [d.wolf] : [d.wolf, d.partner!];
                    const opponents = game.players.filter(p => !wolfTeam.includes(p));

                    return (
                      <>
                        {/* Wolf team */}
                        <div className="bg-wolf-orange-bg rounded-xl border border-wolf-orange/20 pt-2.5 px-3.5 pb-1.5 mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-mono text-wolf-orange font-semibold tracking-[1.5px] flex items-center gap-1.5">
                              🐺 {isLone ? 'LONE WOLF' : 'WOLF TEAM'}
                            </div>
                            {isLone && (
                              <span className="text-[11px] font-mono text-wolf-orange bg-wolf-orange/10 py-0.5 px-2 rounded">
                                +{LONE_WOLF_POINTS[d.loneWolf!]} to win
                              </span>
                            )}
                          </div>
                          {wolfTeam.map(p => {
                            const strokes = strokesThisHole[p] || 0;
                            const isWolf = p === d.wolf;
                            return (
                              <div key={p} className="flex items-center gap-1.5 mb-2">
                                <div className="flex-1 min-w-0">
                                  <div className={`text-base flex items-center gap-1
                                    ${isWolf ? 'font-bold text-wolf-orange' : 'text-wolf-text'}`}>
                                    {p}
                                    {isWolf && <span className="text-[13px]">🐺</span>}
                                    {strokes > 0 && (
                                      <span className="inline-flex gap-0.5 ml-0.5">
                                        {Array.from({ length: strokes }, (_, i) => (
                                          <span key={i} className="w-1.5 h-1.5 rounded-full bg-wolf-accent inline-block" />
                                        ))}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* VS divider */}
                        <div className="text-center py-1 mb-3 relative">
                          <div className="absolute top-1/2 left-0 right-0 border-t border-wolf-border" />
                          <span className="relative bg-wolf-bg px-3.5 text-xs font-mono text-wolf-text-muted font-semibold tracking-[2px]">
                            VS
                          </span>
                        </div>

                        {/* Opponents */}
                        <div className="bg-wolf-card rounded-xl border border-wolf-border pt-2.5 px-3.5 pb-1.5 mb-3">
                          <div className="text-xs font-mono text-wolf-text-sec font-semibold tracking-[1.5px] mb-2">
                            {isLone ? 'THE FIELD' : 'OPPONENTS'}
                          </div>
                          {opponents.map(p => {
                            const strokes = strokesThisHole[p] || 0;
                            return (
                              <div key={p} className="flex items-center gap-1.5 mb-2">
                                <div className="flex-1 min-w-0">
                                  <div className="text-base flex items-center gap-1 text-wolf-text">
                                    {p}
                                    {strokes > 0 && (
                                      <span className="inline-flex gap-0.5 ml-0.5">
                                        {Array.from({ length: strokes }, (_, i) => (
                                          <span key={i} className="w-1.5 h-1.5 rounded-full bg-wolf-accent inline-block" />
                                        ))}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="text-center text-[13px] text-wolf-text-muted font-mono mb-4">
                          Waiting for scores...
                        </div>
                      </>
                    );
                  })() : (
                    <>
                      {/* Wolf badge */}
                      <div className="flex items-center justify-center gap-2 py-2 px-4 bg-wolf-orange-bg
                        rounded-[20px] border border-wolf-orange/20 mb-4 w-fit mx-auto">
                        <span className="text-lg">🐺</span>
                        <span className="text-wolf-orange font-bold text-base">{wolfName}</span>
                        {roundPos >= (game.lastPlaceWolfStartHole ?? 17) && (
                          <span className="text-[10px] text-wolf-red font-mono bg-wolf-red-bg py-0.5 px-1.5 rounded">
                            LAST PLACE
                          </span>
                        )}
                      </div>

                      {/* WHO POPS */}
                      <div className="bg-wolf-card rounded-xl border border-wolf-border p-3.5 mb-4">
                          <Label className="mb-2">PLAY ORDER</Label>
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

                      {/* Quick standings (with optional skins tab) */}
                      <StandingsToggleCard game={game} standings={standings} skinsData={skinsData} />
                    </>
                  )}
                </>
              )}

              {/* Score next hole button */}
              {isScorekeeper && roundPos === game.holes.length + 1 && !roundComplete && (
                <Button variant="primary" onClick={beginHole}>
                  Score Hole {currentHole}
                </Button>
              )}
              {roundComplete && (
                <Button variant="primary" onClick={() => handleComplete()} className="mt-2">
                  View Settlement &rarr;
                </Button>
              )}
            </div>
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
              {isSix && sixTeams ? (
                <SixHoleInput
                  game={game}
                  holeNum={activeHoleNum}
                  teamA={sixTeams.teamA}
                  teamB={sixTeams.teamB}
                  grossScores={sixGrossScores}
                  setGrossScores={setSixGrossScores}
                  strokesThisHole={editingHoleNum ? getAllStrokesForHole(game, editingHoleNum) : strokesThisHole}
                  holeInfo={(editingHoleNum ? game.course.holes[editingHoleNum - 1] : holeInfo)!}
                  onSubmit={submitHole}
                  onCancel={() => { setHoleInput(null); setEditingHoleNum(null); }}
                />
              ) : isThreeTwoOne ? (
                <ThreeTwoOneHoleInput
                  game={game}
                  holeNum={activeHoleNum}
                  grossScores={threeTwoOneGrossScores}
                  setGrossScores={setThreeTwoOneGrossScores}
                  strokesThisHole={editingHoleNum ? getAllStrokesForHole(game, editingHoleNum) : strokesThisHole}
                  holeInfo={(editingHoleNum ? game.course.holes[editingHoleNum - 1] : holeInfo)!}
                  onSubmit={submitHole}
                  onCancel={() => { setHoleInput(null); setEditingHoleNum(null); }}
                />
              ) : (
                <HoleInputFlow
                  game={game}
                  holeInput={holeInput}
                  setHoleInput={setHoleInput}
                  onSubmit={submitHole}
                  onCancel={() => { setHoleInput(null); setEditingHoleNum(null); }}
                  onWolfDecision={handleWolfDecision}
                  strokesThisHole={editingHoleNum ? getAllStrokesForHole(game, editingHoleNum) : strokesThisHole}
                  holeInfo={(editingHoleNum ? game.course.holes[editingHoleNum - 1] : holeInfo)!}
                />
              )}
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
