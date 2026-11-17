'use client';

import { Label } from '@/components/ui';

/**
 * The pre-scoring 3-2-1 view: every player with their handicap and the strokes
 * they receive on this hole.
 */
export function ThreeTwoOnePlayerList({
  players,
  handicaps,
  strokesThisHole,
}: {
  players: string[];
  handicaps: Record<string, number>;
  strokesThisHole: Record<string, number>;
}) {
  return (
    <div className="bg-wolf-card rounded-xl border border-wolf-border p-3.5 mb-4">
      <Label className="mb-2">PLAYERS</Label>
      {players.map((p, idx) => {
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
                ({handicaps[p]} HC)
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
  );
}
