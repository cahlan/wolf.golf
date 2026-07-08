'use client';

import { getSegmentForHole, HOLES_PER_SEGMENT } from '@/lib/engine';
import { VsDivider } from '@/components/ui';

/**
 * The pre-scoring 6x6x6 view: the segment's hole range plus Team A / Team B
 * rosters with handicaps and per-hole stroke dots.
 */
export function SixMatchupCard({
  teams,
  currentHole,
  handicaps,
  strokesThisHole,
}: {
  teams: { teamA: string[]; teamB: string[] };
  currentHole: number;
  handicaps: Record<string, number>;
  strokesThisHole: Record<string, number>;
}) {
  const segment = getSegmentForHole(currentHole);

  const renderTeam = (players: string[]) =>
    players.map(p => {
      const strokes = strokesThisHole[p] || 0;
      return (
        <div key={p} className="flex items-center justify-between py-[5px]">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] text-wolf-text font-medium">{p}</span>
            <span className="text-[11px] text-wolf-text-muted font-mono">({handicaps[p]} HC)</span>
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
    });

  return (
    <>
      <div className="text-center mb-3">
        <span className="text-[11px] font-mono text-wolf-accent tracking-[1.5px]">
          HOLES {segment * HOLES_PER_SEGMENT + 1}–{(segment + 1) * HOLES_PER_SEGMENT}
        </span>
      </div>

      <div className="bg-wolf-accent-bg rounded-xl border border-wolf-accent/20 p-3.5 mb-3">
        <div className="text-xs font-mono text-wolf-accent font-semibold tracking-[1.5px] mb-2">
          TEAM A
        </div>
        {renderTeam(teams.teamA)}
      </div>

      <VsDivider />

      <div className="bg-wolf-card rounded-xl border border-wolf-border p-3.5 mb-3">
        <div className="text-xs font-mono text-wolf-text-sec font-semibold tracking-[1.5px] mb-2">
          TEAM B
        </div>
        {renderTeam(teams.teamB)}
      </div>
    </>
  );
}
