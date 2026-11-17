'use client';

import { Label } from '@/components/ui';

/**
 * The pre-scoring classic-wolf view: the wolf badge (with a "LAST PLACE" tag on
 * the closing holes) and the tee/play order with handicaps and stroke dots.
 */
export function WolfPlayOrder({
  orderedPlayers,
  wolfName,
  handicaps,
  strokesThisHole,
  lastPlaceActive,
}: {
  orderedPlayers: string[];
  wolfName: string;
  handicaps: Record<string, number>;
  strokesThisHole: Record<string, number>;
  lastPlaceActive: boolean;
}) {
  return (
    <>
      {/* Wolf badge */}
      <div className="flex items-center justify-center gap-2 py-2 px-4 bg-wolf-orange-bg
        rounded-[20px] border border-wolf-orange/20 mb-4 w-fit mx-auto">
        <span className="text-lg">🐺</span>
        <span className="text-wolf-orange font-bold text-base">{wolfName}</span>
        {lastPlaceActive && (
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
    </>
  );
}
