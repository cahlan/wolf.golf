'use client';

import React, { useMemo } from 'react';
import type { Game, HoleInput, HoleInfo } from '@/lib/types/game';
import { getPlayerStrokesOnHole, calculateHolePoints, getHoleMatchupDetail } from '@/lib/engine';
import { LONE_WOLF_POINTS } from '@/lib/engine/constants';
import { Button, Fade, Label, StrokeDots, VsDivider, HolePointsTotals } from '@/components/ui';

interface HoleInputFlowProps {
  game: Game;
  holeInput: HoleInput;
  setHoleInput: React.Dispatch<React.SetStateAction<HoleInput | null>>;
  onSubmit: () => void;
  onCancel: () => void;
  onWolfDecision?: (partner: string | null, loneWolf: 'early' | 'late' | 'default' | null) => void;
  strokesThisHole: Record<string, number>;
  holeInfo: HoleInfo;
  /** Whether the wolf themselves can be changed (last-place wolf holes when editing) */
  wolfEditable?: boolean;
}

export function HoleInputFlow({
  game, holeInput, setHoleInput, onSubmit, onCancel, onWolfDecision, strokesThisHole, holeInfo,
  wolfEditable = false,
}: HoleInputFlowProps) {
  const { phase, wolf, holeNum } = holeInput;
  // When wolfEditable, show a wolf-picker step before the normal wolf-decision phase
  const [pickingWolf, setPickingWolf] = React.useState(wolfEditable && phase === 'wolf-decision');

  const nonWolfPlayers = game.players.filter(p => p !== wolf);
  const rotation = (holeNum - 1) % nonWolfPlayers.length;
  const otherPlayers = [
    ...nonWolfPlayers.slice(rotation),
    ...nonWolfPlayers.slice(0, rotation),
  ];

  function selectWolf(newWolf: string) {
    setHoleInput(prev => prev ? { ...prev, wolf: newWolf, partner: null, loneWolf: null } : prev);
    setPickingWolf(false);
  }
  function selectPartner(partner: string) {
    setHoleInput(prev => prev ? { ...prev, partner, loneWolf: null, phase: 'scores' } : prev);
    onWolfDecision?.(partner, null);
  }
  function selectLoneWolf(type: 'early' | 'late' | 'default') {
    setHoleInput(prev => prev ? { ...prev, partner: null, loneWolf: type, phase: 'scores' } : prev);
    onWolfDecision?.(null, type);
  }
  function updateScore(player: string, value: string) {
    setHoleInput(prev =>
      prev ? { ...prev, grossScores: { ...prev.grossScores, [player]: value } } : prev
    );
  }

  function getEffectiveGross(player: string): number {
    const val = holeInput.grossScores[player];
    if (val === '' || val === undefined) return holeInfo.par;
    return parseInt(val) || holeInfo.par;
  }

  const { previewPoints, matchupDetail } = useMemo(() => {
    const netScores: Record<string, number> = {};
    game.players.forEach(p => {
      netScores[p] = getEffectiveGross(p) - getPlayerStrokesOnHole(game, p, holeNum);
    });
    const completedHole = {
      ...holeInput,
      loneWolf: holeInput.loneWolf,
      players: game.players,
      par: holeInfo.par,
      strokeIndex: holeInfo.strokeIndex,
      grossScores: Object.fromEntries(
        game.players.map(p => [p, getEffectiveGross(p)])
      ),
      netScores,
    };
    return {
      previewPoints: calculateHolePoints(completedHole),
      matchupDetail: getHoleMatchupDetail(completedHole),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holeInput, game, holeNum]);

  return (
    <Fade>
      <div className="text-center mb-3 text-xs font-mono text-wolf-text-muted tracking-[2px]">
        HOLE {holeNum} · PAR {holeInfo.par} · SI {holeInfo.strokeIndex}
      </div>

      {/* WOLF PICKER (last-place holes edit only) */}
      {pickingWolf && (
        <Fade>
          <div className="text-center mb-5">
            <div className="text-xl font-bold mb-1">🐺 Who&apos;s the Wolf?</div>
            <div className="text-sm text-wolf-text-muted">Last place is wolf — confirm or change who has it</div>
          </div>
          <Label>SELECT WOLF</Label>
          {game.players.map(p => (
            <button
              key={p}
              onClick={() => selectWolf(p)}
              className={`w-full py-3.5 px-4 mb-2 border rounded-[10px] text-wolf-text text-base
                font-body cursor-pointer text-left flex justify-between items-center
                ${
                  p === wolf
                    ? 'bg-wolf-orange-bg border-wolf-orange/40 font-bold text-wolf-orange'
                    : 'bg-wolf-card border-wolf-border'
                }`}
            >
              <span>{p}</span>
              {p === wolf && <span className="text-wolf-orange text-sm">🐺 current</span>}
            </button>
          ))}
          <button
            onClick={onCancel}
            className="w-full py-3 bg-transparent border-none text-wolf-text-muted text-sm cursor-pointer mt-1"
          >
            Cancel
          </button>
        </Fade>
      )}

      {/* WOLF DECISION PHASE */}
      {!pickingWolf && phase === 'wolf-decision' && (
        <Fade>
          <div className="text-center mb-5">
            <div className="text-xl font-bold mb-1">🐺 {wolf}&apos;s call</div>
          </div>

          <Label>PICK A PARTNER <span className="text-wolf-text-muted font-normal">— in tee order</span></Label>
          {otherPlayers.map((p, idx) => {
            const s = strokesThisHole[p];
            return (
              <button
                key={p}
                onClick={() => selectPartner(p)}
                className="w-full py-3.5 px-4 mb-2 bg-wolf-card border border-wolf-border
                  rounded-[10px] text-wolf-text text-base font-body cursor-pointer text-left
                  flex justify-between items-center"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-wolf-text-muted w-5">{idx + 1}.</span>
                  <span className="font-medium">{p}</span>
                  <StrokeDots count={s} size="md" className="items-center" />
                </div>
                <span className="text-wolf-text-muted text-[13px]">2v2 &rarr;</span>
              </button>
            );
          })}

          <Label className="mt-5">GO LONE WOLF 🐺</Label>
          {([
            { type: 'early' as const, label: 'Lone Before Drives', pts: LONE_WOLF_POINTS.early, desc: 'Before anyone hits' },
            { type: 'late' as const, label: 'Lone After Drives', pts: LONE_WOLF_POINTS.late, desc: 'After others hit, before wolf' },
            { type: 'default' as const, label: 'Default Lone', pts: LONE_WOLF_POINTS.default, desc: "Didn't pick anyone" },
          ]).map(opt => (
            <button
              key={opt.type}
              onClick={() => selectLoneWolf(opt.type)}
              className="w-full py-3.5 px-4 mb-2 bg-wolf-orange-bg border border-wolf-orange/20
                rounded-[10px] text-wolf-text text-[15px] font-body cursor-pointer text-left
                flex justify-between items-center"
            >
              <div>
                <div className="font-semibold">{opt.label}</div>
                <div className="text-xs text-wolf-text-sec mt-0.5">{opt.desc}</div>
              </div>
              <div className="font-mono text-wolf-orange font-extrabold text-xl">
                +{opt.pts}
              </div>
            </button>
          ))}

          <button
            onClick={onCancel}
            className="w-full py-3 bg-transparent border-none text-wolf-text-muted text-sm cursor-pointer mt-1"
          >
            Cancel
          </button>
        </Fade>
      )}

      {/* SCORES PHASE */}
      {!pickingWolf && phase === 'scores' && <ScoresPhase
        game={game}
        holeInput={holeInput}
        setHoleInput={setHoleInput}
        holeInfo={holeInfo}
        strokesThisHole={strokesThisHole}
        getEffectiveGross={getEffectiveGross}
        updateScore={updateScore}
        previewPoints={previewPoints}
        matchupDetail={matchupDetail}
        onSubmit={onSubmit}
        onWolfDecision={onWolfDecision}
        wolf={wolf}
      />}
    </Fade>
  );
}

function ScoresPhase({
  game, holeInput, setHoleInput, holeInfo, strokesThisHole,
  getEffectiveGross, updateScore, previewPoints, matchupDetail, onSubmit, onWolfDecision, wolf,
}: {
  game: Game;
  holeInput: HoleInput;
  setHoleInput: React.Dispatch<React.SetStateAction<HoleInput | null>>;
  holeInfo: HoleInfo;
  strokesThisHole: Record<string, number>;
  getEffectiveGross: (player: string) => number;
  updateScore: (player: string, value: string) => void;
  previewPoints: Record<string, number>;
  matchupDetail: ReturnType<typeof getHoleMatchupDetail>;
  onSubmit: () => void;
  onWolfDecision?: (partner: string | null, loneWolf: 'early' | 'late' | 'default' | null) => void;
  wolf: string;
}) {
  const isLone = !!holeInput.loneWolf;
  const wolfTeam = isLone ? [wolf] : [wolf, holeInput.partner!];
  const opponentTeam = game.players.filter(p => !wolfTeam.includes(p));

  function renderPlayerRow(p: string) {
    const strokes = strokesThisHole[p];
    const isWolf = p === wolf;
    const gross = getEffectiveGross(p);
    const net = gross - strokes;

    return (
      <div key={p} className="flex items-center gap-1.5 mb-2">
        <div className="flex-1 min-w-0">
          <div className={`text-base flex items-center gap-1
            ${isWolf ? 'font-bold text-wolf-orange' : 'text-wolf-text'}`}>
            {p}
            {isWolf && <span className="text-[13px]">🐺</span>}
            <StrokeDots count={strokes} className="ml-0.5" />
          </div>
        </div>
        <Button
          variant="score"
          onClick={() => {
            const curr = parseInt(holeInput.grossScores[p]) || holeInfo.par;
            updateScore(p, String(Math.max(1, curr - 1)));
          }}
        >
          &minus;
        </Button>
        <input
          type="number"
          value={holeInput.grossScores[p]}
          onChange={e => updateScore(p, e.target.value)}
          placeholder={String(holeInfo.par)}
          className="w-12 text-center py-2.5 px-0.5 bg-wolf-card border border-wolf-border
            rounded-lg text-wolf-text text-xl font-mono font-extrabold outline-none"
        />
        <Button
          variant="score"
          onClick={() => {
            const curr = parseInt(holeInput.grossScores[p]) || holeInfo.par;
            updateScore(p, String(curr + 1));
          }}
        >
          +
        </Button>
        <div className={`w-8 text-center font-mono text-[15px] font-bold
          ${strokes > 0 ? 'text-wolf-accent' : 'text-wolf-text-sec'}`}>
          {net}
        </div>
      </div>
    );
  }

  return (
    <Fade>
      {/* Wolf team */}
      <div className="bg-wolf-orange-bg rounded-xl border border-wolf-orange/20 pt-2.5 px-3.5 pb-1.5 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-mono text-wolf-orange font-semibold tracking-[1.5px] flex items-center gap-1.5">
            🐺 {isLone ? 'LONE WOLF' : 'WOLF TEAM'}
          </div>
          {isLone && (
            <span className="text-[11px] font-mono text-wolf-orange bg-wolf-orange/10 py-0.5 px-2 rounded">
              +{LONE_WOLF_POINTS[holeInput.loneWolf!]} to win
            </span>
          )}
        </div>
        {wolfTeam.map(renderPlayerRow)}
      </div>

      <VsDivider />

      {/* Opponent team */}
      <div className="bg-wolf-card rounded-xl border border-wolf-border pt-2.5 px-3.5 pb-1.5 mb-3">
        <div className="text-xs font-mono text-wolf-text-sec font-semibold tracking-[1.5px] mb-2">
          {isLone ? 'THE FIELD' : 'OPPONENTS'}
        </div>
        {opponentTeam.map(renderPlayerRow)}
      </div>

      {/* Points preview */}
      <div className="bg-wolf-accent-bg rounded-[10px] border border-wolf-accent/20 p-3.5 mt-3">
        <Label className="text-wolf-accent mb-2">MATCHUP BREAKDOWN</Label>

        {matchupDetail.lines.map((line, i) => (
          <div
            key={i}
            className={`flex items-center justify-between py-1.5
              ${i > 0 ? 'border-t border-wolf-accent/10' : ''}`}
          >
            <span className="text-[13px] text-wolf-text-sec flex-1">{line.label}</span>
            <span className={`font-mono text-xs font-bold ml-2 py-0.5 px-2 rounded
              ${line.result === 'wolf' ? 'bg-wolf-accent/10 text-wolf-accent' :
                line.result === 'opp' || line.result === 'field' ? 'bg-wolf-red/10 text-wolf-red' :
                'bg-wolf-elevated text-wolf-text-muted'}`}>
              {line.result === 'wolf' ? '🐺 WIN' :
               line.result === 'opp' || line.result === 'field' ? 'LOSS' : 'PUSH'}
            </span>
          </div>
        ))}

        <div className="mt-2.5 pt-2.5 border-t border-wolf-accent/20 text-center text-sm font-bold text-wolf-text">
          {matchupDetail.summary}
        </div>

        <HolePointsTotals players={game.players} points={previewPoints} />
      </div>

      <div className="flex gap-2.5 mt-5">
        <Button
          onClick={() => {
            setHoleInput(prev =>
              prev ? { ...prev, phase: 'wolf-decision', partner: null, loneWolf: null } : prev
            );
            onWolfDecision?.(null, null);
          }}
          className="flex-1"
        >
          &larr; Back
        </Button>
        <Button variant="primary" onClick={onSubmit} className="flex-[2]">
          Confirm &#10003;
        </Button>
      </div>
    </Fade>
  );
}
