'use client';

import type { PendingWolfDecision } from '@/lib/types/game';
import { LONE_WOLF_POINTS } from '@/lib/engine/constants';
import { StrokeDots, VsDivider } from '@/components/ui';

/**
 * Spectator view while the scorekeeper is entering scores on a wolf hole: shows
 * the confirmed wolf team vs. the field (or "lone wolf" vs. the field) with a
 * "Waiting for scores…" footer.
 */
export function WolfPendingDecision({
  pending,
  players,
  strokesThisHole,
}: {
  pending: PendingWolfDecision;
  players: string[];
  strokesThisHole: Record<string, number>;
}) {
  const isLone = !!pending.loneWolf;
  const wolfTeam = isLone ? [pending.wolf] : [pending.wolf, pending.partner!];
  const opponents = players.filter(p => !wolfTeam.includes(p));

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
              +{LONE_WOLF_POINTS[pending.loneWolf!]} to win
            </span>
          )}
        </div>
        {wolfTeam.map(p => {
          const strokes = strokesThisHole[p] || 0;
          const isWolf = p === pending.wolf;
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
            </div>
          );
        })}
      </div>

      <VsDivider />

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
                  <StrokeDots count={strokes} className="ml-0.5" />
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
}
