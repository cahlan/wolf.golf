'use client';

import type { CompletedHole } from '@/lib/types/game';
import { calculateHolePoints, getHoleMatchupDetail } from '@/lib/engine';
import { Label } from '@/components/ui';

export function LastHoleResult({ hole }: { hole: CompletedHole }) {
  const pts = calculateHolePoints(hole);
  const detail = getHoleMatchupDetail(hole);

  return (
    <div className="bg-wolf-card rounded-[10px] border border-wolf-border p-3.5">
      <Label className="mb-1.5">HOLE {hole.holeNum} RESULT</Label>
      <div className="mb-2 text-[13px] text-wolf-text-sec">
        {hole.loneWolf
          ? <span>🐺 {hole.wolf} went lone ({hole.loneWolf})</span>
          : <span>🐺 {hole.wolf} picked {hole.partner}</span>
        }
      </div>
      {detail.lines.map((line, i) => (
        <div
          key={i}
          className={`flex items-center justify-between py-1 text-[13px]
            ${i > 0 ? 'border-t border-wolf-border' : ''}`}
        >
          <span className="text-wolf-text-sec">{line.label}</span>
          <span className={`font-mono text-[11px] font-semibold
            ${line.result === 'wolf' ? 'text-wolf-accent' :
              line.result === 'opp' || line.result === 'field' ? 'text-wolf-red' : 'text-wolf-text-muted'}`}>
            {line.result === 'wolf' ? '🐺' :
             line.result === 'opp' || line.result === 'field' ? '✗' : '—'}
          </span>
        </div>
      ))}
      <div className="mt-2 pt-2 border-t border-wolf-border flex justify-around">
        {Object.entries(pts).map(([name, p]) => (
          <div key={name} className="text-center">
            <div className="text-[11px] text-wolf-text-muted">{name.slice(0, 5)}</div>
            <div className={`font-mono font-extrabold text-base
              ${p > 0 ? 'text-wolf-accent' : 'text-wolf-text-muted'}`}>
              {p > 0 ? `+${p}` : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
