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
import type { Game, HoleInput } from '@/lib/types/game';
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
  const { game, setGame, isScorekeeper, isSpectator, spectateGame, leaveSpectator, completeRound, abandonGame } = useGame();
  const [fetchingRemote, setFetchingRemote] = useState(false);
  const hasFetched = useRef(false);

  // If no game in context (e.g. page refresh as spectator), try fetching from Supabase
  // Runs once on mount — `game` is deliberately excluded from deps to prevent re-fetch loops.
  useEffect(() => {
    if (hasFetched.current || isScorekeeper) return;
    if (game) { hasFetched.current = true; return; }
    hasFetched.current = true;
    let cancelled = false;
    setFetchingRemote(true);
    supabase
      .from('games')
      .select('state')
      .eq('id', gameId)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.state) {
          spectateGame(data.state as Game);
        } else {
          router.push('/');
        }
        setFetchingRemote(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, isScorekeeper]);

  if (fetchingRemote) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <span className="text-wolf-text-muted font-mono text-sm">Loading game...</span>
      </div>
    );
  }

  if (!game) {
    router.push('/');
    return null;
  }

  return (
    <GameView
      game={game}
      setGame={setGame}
      isScorekeeper={isScorekeeper}
      isSpectator={isSpectator}
      completeRound={completeRound}
      abandonGame={abandonGame}
      leaveSpectator={leaveSpectator}
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
}: {
  game: Game;
  setGame: (g: Game | null) => void;
  isScorekeeper: boolean;
  isSpectator: boolean;
  completeRound: (gameOverride?: Game) => void;
  abandonGame: () => void;
  leaveSpectator: () => void;
}) {
  const router = useRouter();
  const [currentHole, setCurrentHole] = useState(() => game.holes.length + 1);
  const [tab, setTab] = useState<'play' | 'standings' | 'skins'>('play');
  const [holeInput, setHoleInput] = useState<HoleInput | null>(null);
  const [editingHoleNum, setEditingHoleNum] = useState<number | null>(null);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  // Keep spectators on the latest hole as scores come in
  useEffect(() => {
    if (isSpectator) {
      setCurrentHole(game.holes.length + 1);
    }
  }, [isSpectator, game.holes.length]);

  const activeHoleNum = editingHoleNum || currentHole;

  const standings = useMemo(() => calculateStandings(game), [game]);
  const skinsData = useMemo(() => calculateSkins(game), [game]);
  const wolfIdx = activeHoleNum <= 18 ? getWolfForHole(game, activeHoleNum) : 0;
  const wolfName = game.players[wolfIdx];
  const holeInfo = activeHoleNum <= 18 ? game.course.holes[activeHoleNum - 1] : null;
  const strokesThisHole = activeHoleNum <= 18 ? getAllStrokesForHole(game, activeHoleNum) : {};

  const startHole = useCallback(() => {
    const gs: Record<string, string> = {};
    game.players.forEach(p => (gs[p] = ''));
    setEditingHoleNum(null);
    setHoleInput({
      holeNum: currentHole,
      wolf: wolfName,
      partner: null,
      loneWolf: null,
      grossScores: gs,
      phase: 'wolf-decision',
    });
  }, [game.players, currentHole, wolfName]);

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
          {isSpectator && (
            <span className="text-[10px] font-mono bg-wolf-card border border-wolf-border text-wolf-text-muted py-0.5 px-1.5 rounded">
              SPECTATING
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
                  onClick={() => setCurrentHole(h => Math.max(1, h - 1))}
                  disabled={currentHole <= 1}
                  className={`bg-transparent border border-wolf-border rounded-lg py-2 px-3.5
                    font-mono text-[13px] ${currentHole <= 1 ? 'text-wolf-text-muted opacity-30 cursor-default' : 'text-wolf-text cursor-pointer'}`}
                >
                  &larr; {currentHole > 1 ? currentHole - 1 : ''}
                </button>

                <div className="text-center">
                  <div className="text-xs text-wolf-text-muted font-mono mb-0.5">
                    {currentHole <= game.holes.length ? 'COMPLETED' : currentHole <= 18 ? 'NEXT UP' : 'DONE'}
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
                  onClick={() => setCurrentHole(h => Math.min(game.holes.length + 1, Math.min(19, h + 1)))}
                  disabled={currentHole > 18 || currentHole > game.holes.length}
                  className={`bg-transparent border border-wolf-border rounded-lg py-2 px-3.5
                    font-mono text-[13px] ${(currentHole > 18 || currentHole > game.holes.length)
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
                  {currentHole >= 17 && (
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
                  {game.players.map(p => {
                    const strokes = strokesThisHole[p];
                    const isWolf = p === wolfName;
                    return (
                      <div
                        key={p}
                        className={`flex items-center justify-between py-[7px]
                          ${p !== game.players[0] ? 'border-t border-wolf-border' : ''}`}
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

              {/* Quick standings */}
              <div className="bg-wolf-card rounded-xl border border-wolf-border p-3.5 mb-4">
                <Label className="mb-2">
                  STANDINGS{game.holes.length > 0 ? ` — ${game.holes.length} HOLES` : ''}
                </Label>
                {standings.map((s, i) => (
                  <div
                    key={s.name}
                    className={`flex justify-between py-[5px]
                      ${i > 0 ? 'border-t border-wolf-border' : ''}`}
                  >
                    <span className={`${i === 0 && s.points > 0 ? 'text-wolf-accent font-semibold' : 'text-wolf-text'}`}>
                      {i === 0 && s.points > 0 ? '👑 ' : ''}{s.name}
                    </span>
                    <span className={`font-mono font-bold ${s.points > 0 ? 'text-wolf-accent' : 'text-wolf-text-muted'}`}>
                      {s.points}
                    </span>
                  </div>
                ))}
              </div>

              {/* Inline Wolf / Skins toggle card */}
              <StandingsToggleCard game={game} standings={standings} skinsData={skinsData} />

              {/* Viewing a completed hole */}
              {currentHole <= game.holes.length && (
                <div className="mb-4">
                  <LastHoleResult hole={game.holes[currentHole - 1]} />
                  {isScorekeeper && (
                    <Button onClick={() => editHole(currentHole)} className="mt-2">
                      ✎ Edit Hole {currentHole}
                    </Button>
                  )}
                </div>
              )}

              {/* Score next hole button */}
              {isScorekeeper && currentHole === game.holes.length + 1 && currentHole <= 18 && (
                <Button variant="primary" onClick={startHole}>
                  Score Hole {currentHole}
                </Button>
              )}
              {game.holes.length >= 18 && (
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
