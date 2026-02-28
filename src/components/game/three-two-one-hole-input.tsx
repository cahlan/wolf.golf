'use client';

import { useMemo } from 'react';
import type { Game, HoleInfo } from '@/lib/types/game';
import { getPlayerStrokesOnHole } from '@/lib/engine';
import { calculateThreeTwoOneHolePoints, getThreeTwoOneMatchupDetail } from '@/lib/engine/three-two-one';
import { Button, Fade, Label } from '@/components/ui';

interface ThreeTwoOneHoleInputProps {
  game: Game;
  holeNum: number;
  grossScores: Record<string, string>;
  setGrossScores: (scores: Record<string, string>) => void;
  strokesThisHole: Record<string, number>;
  holeInfo: HoleInfo;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ThreeTwoOneHoleInput({
  game, holeNum, grossScores, setGrossScores,
  strokesThisHole, holeInfo, onSubmit, onCancel,
}: ThreeTwoOneHoleInputProps) {
  function updateScore(player: string, value: string) {
    setGrossScores({ ...grossScores, [player]: value });
  }

  function getEffectiveGross(player: string): number {
    const val = grossScores[player];
    if (val === '' || val === undefined) return holeInfo.par;
    return parseInt(val) || holeInfo.par;
  }

  const { previewPoints, matchupDetail } = useMemo(() => {
    const netScores: Record<string, number> = {};
    game.players.forEach(p => {
      netScores[p] = getEffectiveGross(p) - getPlayerStrokesOnHole(game, p, holeNum);
    });
    const completedHole = {
      holeNum,
      par: holeInfo.par,
      strokeIndex: holeInfo.strokeIndex,
      wolf: game.players[0],
      partner: null,
      loneWolf: null,
      players: game.players,
      grossScores: Object.fromEntries(
        game.players.map(p => [p, getEffectiveGross(p)])
      ),
      netScores,
    };
    return {
      previewPoints: calculateThreeTwoOneHolePoints(completedHole),
      matchupDetail: getThreeTwoOneMatchupDetail(completedHole),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grossScores, game, holeNum]);

  return (
    <Fade>
      <div className="text-center mb-3 text-xs font-mono text-wolf-text-muted tracking-[2px]">
        HOLE {holeNum} · PAR {holeInfo.par} · SI {holeInfo.strokeIndex}
      </div>

      {/* All players */}
      <div className="bg-wolf-card rounded-xl border border-wolf-border pt-2.5 px-3.5 pb-1.5 mb-3">
        <div className="text-xs font-mono text-wolf-text-sec font-semibold tracking-[1.5px] mb-2">
          SCORES
        </div>
        {game.players.map(p => {
          const strokes = strokesThisHole[p];
          const gross = getEffectiveGross(p);
          const net = gross - strokes;

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
              <Button
                variant="score"
                onClick={() => {
                  const curr = parseInt(grossScores[p]) || holeInfo.par;
                  updateScore(p, String(Math.max(1, curr - 1)));
                }}
              >
                &minus;
              </Button>
              <input
                type="number"
                value={grossScores[p]}
                onChange={e => updateScore(p, e.target.value)}
                placeholder={String(holeInfo.par)}
                className="w-12 text-center py-2.5 px-0.5 bg-wolf-card border border-wolf-border
                  rounded-lg text-wolf-text text-xl font-mono font-extrabold outline-none"
              />
              <Button
                variant="score"
                onClick={() => {
                  const curr = parseInt(grossScores[p]) || holeInfo.par;
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
        })}
      </div>

      {/* 3-2-1 ranking preview */}
      <div className="bg-wolf-accent-bg rounded-[10px] border border-wolf-accent/20 p-3.5 mt-3">
        <Label className="text-wolf-accent mb-2">3-2-1 RANKING</Label>

        {matchupDetail.rankings.map((r, i) => (
          <div
            key={r.name}
            className={`flex items-center justify-between py-1.5
              ${i > 0 ? 'border-t border-wolf-accent/10' : ''}`}
          >
            <span className="text-[13px] text-wolf-text-sec flex-1">
              {r.name} (net {r.netScore})
            </span>
            <span className={`font-mono text-sm font-bold ml-2 py-0.5 px-2 rounded
              ${r.points >= 3 ? 'bg-wolf-accent/10 text-wolf-accent' : r.points >= 2 ? 'bg-wolf-accent/5 text-wolf-accent' : 'bg-wolf-elevated text-wolf-text-muted'}`}>
              +{r.points}
            </span>
          </div>
        ))}

        <div className="mt-2.5 pt-2.5 border-t border-wolf-accent/20 text-center text-sm font-bold text-wolf-text">
          {matchupDetail.summary}
        </div>

        <div className="flex justify-around mt-2.5">
          {game.players.map(p => {
            const pts = previewPoints[p];
            return (
              <div key={p} className="text-center">
                <div className="text-[11px] text-wolf-text-muted">{p.slice(0, 5)}</div>
                <div className={`font-mono font-extrabold text-lg
                  ${pts >= 3 ? 'text-wolf-accent' : pts >= 2 ? 'text-wolf-accent' : 'text-wolf-text-muted'}`}>
                  +{pts}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2.5 mt-5">
        <Button onClick={onCancel} className="flex-1">
          &larr; Cancel
        </Button>
        <Button variant="primary" onClick={onSubmit} className="flex-[2]">
          Confirm &#10003;
        </Button>
      </div>
    </Fade>
  );
}
