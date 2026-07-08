'use client';

import type { Game, CompletedHole } from '@/lib/types/game';
import { getPlayerStrokesOnHole } from '@/lib/engine';
import { calculateThreeTwoOneHolePoints, getThreeTwoOneMatchupDetail } from '@/lib/engine/three-two-one';
import { Label, StrokeDots } from '@/components/ui';

export function ThreeTwoOneHoleResultDetail({ game, hole }: { game: Game; hole: CompletedHole }) {
  const pts = calculateThreeTwoOneHolePoints(hole);
  const detail = getThreeTwoOneMatchupDetail(hole);

  return (
    <div>
      {/* All players with scores */}
      <div className="bg-wolf-card rounded-xl border border-wolf-border p-3.5 mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-xs font-mono text-wolf-text-sec font-semibold tracking-[1.5px]">
            SCORES
          </div>
          <div className="flex gap-3 text-[10px] font-mono text-wolf-text-muted tracking-wider">
            <span>GRS</span>
            <span>NET</span>
          </div>
        </div>
        {game.players.map((p, i) => {
          const strokes = getPlayerStrokesOnHole(game, p, hole.holeNum);
          const gross = hole.grossScores[p];
          const net = hole.netScores[p];

          return (
            <div
              key={p}
              className={`flex items-center justify-between py-1.5
                ${i > 0 ? 'border-t border-wolf-border' : ''}`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-base text-wolf-text">{p}</span>
                <StrokeDots count={strokes} className="ml-0.5" />
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span className="text-[13px] text-wolf-text-muted">{gross}</span>
                <span className={`text-[15px] font-bold ${strokes > 0 ? 'text-wolf-accent' : 'text-wolf-text-sec'}`}>
                  {net}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3-2-1 ranking breakdown */}
      <div className="bg-wolf-accent-bg rounded-[10px] border border-wolf-accent/20 p-3.5">
        <Label className="text-wolf-accent mb-2">3-2-1 RANKING</Label>

        {detail.rankings.map((r, i) => (
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
          {detail.summary}
        </div>

        <div className="flex justify-around mt-2.5">
          {game.players.map(p => {
            const points = pts[p];
            return (
              <div key={p} className="text-center">
                <div className="text-[11px] text-wolf-text-muted">{p.slice(0, 5)}</div>
                <div className={`font-mono font-extrabold text-lg
                  ${points >= 3 ? 'text-wolf-accent' : points >= 2 ? 'text-wolf-accent' : 'text-wolf-text-muted'}`}>
                  +{points}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
