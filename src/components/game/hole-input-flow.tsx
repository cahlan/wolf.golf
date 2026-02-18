'use client';

import { useMemo } from 'react';
import type { Game, HoleInput, HoleInfo } from '@/lib/types/game';
import { getPlayerStrokesOnHole, calculateHolePoints, getHoleMatchupDetail } from '@/lib/engine';
import { Button, Fade, Label } from '@/components/ui';

interface HoleInputFlowProps {
  game: Game;
  holeInput: HoleInput;
  setHoleInput: React.Dispatch<React.SetStateAction<HoleInput | null>>;
  onSubmit: () => void;
  onCancel: () => void;
  strokesThisHole: Record<string, number>;
  holeInfo: HoleInfo;
}

export function HoleInputFlow({
  game, holeInput, setHoleInput, onSubmit, onCancel, strokesThisHole, holeInfo,
}: HoleInputFlowProps) {
  const { phase, wolf, holeNum } = holeInput;

  const nonWolfPlayers = game.players.filter(p => p !== wolf);
  const rotation = (holeNum - 1) % nonWolfPlayers.length;
  const otherPlayers = [
    ...nonWolfPlayers.slice(rotation),
    ...nonWolfPlayers.slice(0, rotation),
  ];

  function selectPartner(partner: string) {
    setHoleInput(prev => prev ? { ...prev, partner, loneWolf: null, phase: 'scores' } : prev);
  }
  function selectLoneWolf(type: 'early' | 'late' | 'default') {
    setHoleInput(prev => prev ? { ...prev, partner: null, loneWolf: type, phase: 'scores' } : prev);
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

  const previewPoints = useMemo(() => {
    const netScores: Record<string, number> = {};
    game.players.forEach(p => {
      netScores[p] = getEffectiveGross(p) - getPlayerStrokesOnHole(game, p, holeNum);
    });
    return calculateHolePoints({
      ...holeInput,
      loneWolf: holeInput.loneWolf,
      players: game.players,
      par: holeInfo.par,
      strokeIndex: holeInfo.strokeIndex,
      grossScores: Object.fromEntries(
        game.players.map(p => [p, getEffectiveGross(p)])
      ),
      netScores,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holeInput, game, holeNum]);

  return (
    <Fade>
      <div className="text-center mb-3 text-xs font-mono text-wolf-text-muted tracking-[2px]">
        HOLE {holeNum} · PAR {holeInfo.par} · SI {holeInfo.strokeIndex}
      </div>

      {/* WOLF DECISION PHASE */}
      {phase === 'wolf-decision' && (
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
                  {s > 0 && (
                    <span className="inline-flex gap-0.5 items-center">
                      {Array.from({ length: s }, (_, i) => (
                        <span key={i} className="w-[7px] h-[7px] rounded-full bg-wolf-accent inline-block" />
                      ))}
                    </span>
                  )}
                </div>
                <span className="text-wolf-text-muted text-[13px]">2v2 &rarr;</span>
              </button>
            );
          })}

          <Label className="mt-5">GO LONE WOLF 🐺</Label>
          {([
            { type: 'early' as const, label: 'Lone Before Drives', pts: 4, desc: 'Before anyone hits' },
            { type: 'late' as const, label: 'Lone After Drives', pts: 3, desc: 'After others hit, before wolf' },
            { type: 'default' as const, label: 'Default Lone', pts: 2, desc: "Didn't pick anyone" },
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
      {phase === 'scores' && <ScoresPhase
        game={game}
        holeInput={holeInput}
        setHoleInput={setHoleInput}
        holeInfo={holeInfo}
        strokesThisHole={strokesThisHole}
        getEffectiveGross={getEffectiveGross}
        updateScore={updateScore}
        previewPoints={previewPoints}
        onSubmit={onSubmit}
        holeNum={holeNum}
        wolf={wolf}
      />}
    </Fade>
  );
}

function ScoresPhase({
  game, holeInput, setHoleInput, holeInfo, strokesThisHole,
  getEffectiveGross, updateScore, previewPoints, onSubmit, holeNum, wolf,
}: {
  game: Game;
  holeInput: HoleInput;
  setHoleInput: React.Dispatch<React.SetStateAction<HoleInput | null>>;
  holeInfo: HoleInfo;
  strokesThisHole: Record<string, number>;
  getEffectiveGross: (player: string) => number;
  updateScore: (player: string, value: string) => void;
  previewPoints: Record<string, number>;
  onSubmit: () => void;
  holeNum: number;
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
          <div className={`text-[15px] flex items-center gap-1
            ${isWolf ? 'font-bold text-wolf-orange' : 'text-wolf-text'}`}>
            {isWolf && <span className="text-[13px]">🐺</span>}
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

  // Compute matchup detail for preview
  const netScores: Record<string, number> = {};
  game.players.forEach(p => {
    netScores[p] = getEffectiveGross(p) - getPlayerStrokesOnHole(game, p, holeNum);
  });
  const tempHole = {
    ...holeInput,
    players: game.players,
    par: holeInfo.par,
    strokeIndex: holeInfo.strokeIndex,
    netScores,
    grossScores: Object.fromEntries(
      game.players.map(p => [p, getEffectiveGross(p)])
    ),
  };
  const detail = getHoleMatchupDetail(tempHole);

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
              +{({ early: 4, late: 3, default: 2 })[holeInput.loneWolf!]} to win
            </span>
          )}
        </div>
        {wolfTeam.map(renderPlayerRow)}
      </div>

      {/* VS divider */}
      <div className="text-center py-1 mb-3 relative">
        <div className="absolute top-1/2 left-0 right-0 border-t border-wolf-border" />
        <span className="relative bg-wolf-bg px-3.5 text-xs font-mono text-wolf-text-muted font-semibold tracking-[2px]">
          VS
        </span>
      </div>

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

        {detail.lines.map((line, i) => (
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
          {detail.summary}
        </div>

        <div className="flex justify-around mt-2.5">
          {game.players.map(p => {
            const pts = previewPoints[p];
            return (
              <div key={p} className="text-center">
                <div className="text-[11px] text-wolf-text-muted">{p.slice(0, 5)}</div>
                <div className={`font-mono font-extrabold text-lg
                  ${pts > 0 ? 'text-wolf-accent' : 'text-wolf-text-muted'}`}>
                  {pts > 0 ? `+${pts}` : '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2.5 mt-5">
        <Button
          onClick={() => setHoleInput(prev =>
            prev ? { ...prev, phase: 'wolf-decision', partner: null, loneWolf: null } : prev
          )}
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
