'use client';

import type { CompletedHole, HoleInfo } from '@/lib/types/game';
import { courseHoleForRoundPos } from '@/lib/engine';

/**
 * Prev/next hole stepper with the big current-hole number and par/SI line.
 * Navigation is bounded to already-played holes plus the next one to play.
 */
export function HoleNavigator({
  startHole,
  roundPos,
  setRoundPos,
  currentHole,
  holeInfo,
  roundComplete,
  holes,
}: {
  startHole: number;
  roundPos: number;
  setRoundPos: (updater: (p: number) => number) => void;
  currentHole: number;
  holeInfo: HoleInfo | null;
  roundComplete: boolean;
  holes: CompletedHole[];
}) {
  return (
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
          {holes.some(h => h.holeNum === currentHole) ? 'COMPLETED' : roundComplete ? 'DONE' : 'NEXT UP'}
        </div>
        <div className="text-[44px] font-extrabold font-display tracking-[-3px]">
          {roundComplete && roundPos > holes.length ? '✓' : currentHole}
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
        onClick={() => setRoundPos(p => Math.min(holes.length + 1, p + 1))}
        disabled={roundPos > holes.length}
        className={`bg-transparent border border-wolf-border rounded-lg py-2 px-3.5
          font-mono text-[13px] ${roundPos > holes.length
            ? 'text-wolf-text-muted opacity-30 cursor-default' : 'text-wolf-text cursor-pointer'}`}
      >
        {roundPos <= holes.length ? courseHoleForRoundPos(startHole, roundPos + 1) : ''} &rarr;
      </button>
    </div>
  );
}
