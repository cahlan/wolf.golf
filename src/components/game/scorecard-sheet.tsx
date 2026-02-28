'use client';

import type { Game } from '@/lib/types/game';
import { BottomSheet, Label } from '@/components/ui';

function sum(vals: number[]) {
  return vals.reduce((a, b) => a + b, 0);
}

export function ScorecardSheet({ game, open, onClose }: { game: Game; open: boolean; onClose: () => void }) {
  const holes = Array.from({ length: 18 }, (_, i) => i + 1);

  const holeByNum = new Map(game.holes.map(h => [h.holeNum, h] as const));

  const totals = game.players.reduce((acc, p) => {
    const gross = sum(game.holes.map(h => h.grossScores[p] ?? 0));
    const net = sum(game.holes.map(h => h.netScores[p] ?? 0));
    acc[p] = { gross, net };
    return acc;
  }, {} as Record<string, { gross: number; net: number }>);

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-base font-bold">Scorecard</div>
          <div className="text-[11px] font-mono text-wolf-text-muted">gross/net by hole</div>
        </div>
        <button
          onClick={onClose}
          className="bg-transparent border border-wolf-border rounded px-2 py-1 text-[11px] font-mono text-wolf-text-muted hover:text-wolf-accent hover:border-wolf-accent transition-colors"
        >
          Close
        </button>
      </div>

      <Label className="mb-2">HOLES</Label>
      <div className="overflow-x-auto rounded-[10px] border border-wolf-border">
        <table className="w-full border-collapse text-[12px] font-mono">
          <thead>
            <tr className="bg-wolf-card">
              <th className="py-2 px-2.5 text-left text-wolf-text-muted font-medium">Player</th>
              {holes.map((hNum) => {
                const hole = holeByNum.get(hNum);
                const par = hole?.par;
                return (
                  <th
                    key={hNum}
                    className="py-2 px-2 text-center text-wolf-text-sec font-medium text-[11px] whitespace-nowrap"
                  >
                    <div className="leading-none pb-1 border-b border-wolf-border">{hNum}</div>
                    <div className="mt-1 text-[10px] text-wolf-text-muted leading-none">{par ?? '·'}</div>
                  </th>
                );
              })}
              <th className="py-2 px-2 text-center text-wolf-text-sec font-medium text-[11px] whitespace-nowrap">Tot</th>
            </tr>
          </thead>
          <tbody>
            {game.players.map((p) => (
              <tr key={p} className="border-t border-wolf-border">
                <td className="py-2 px-2.5 text-wolf-text whitespace-nowrap">
                  <span className="font-semibold">{p}</span>{' '}
                  <span className="text-[10px] text-wolf-text-muted">({game.handicaps[p]} HC)</span>
                </td>

                {holes.map((hNum) => {
                  const hole = holeByNum.get(hNum);
                  const g = hole?.grossScores?.[p];
                  const n = hole?.netScores?.[p];
                  const played = typeof g === 'number' && typeof n === 'number';
                  return (
                    <td key={hNum} className="py-2 px-2 text-center whitespace-nowrap">
                      {played ? (
                        <span className="text-wolf-text">
                          {g}
                          <span className="text-wolf-text-muted">/</span>
                          <span className="text-wolf-accent font-semibold">{n}</span>
                        </span>
                      ) : (
                        <span className="text-wolf-text-muted">·</span>
                      )}
                    </td>
                  );
                })}

                <td className="py-2 px-2 text-center whitespace-nowrap">
                  <span className="text-wolf-text">
                    {totals[p].gross}
                    <span className="text-wolf-text-muted">/</span>
                    <span className="text-wolf-accent font-semibold">{totals[p].net}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-[11px] font-mono text-wolf-text-muted">
        Tip: cell format is <span className="text-wolf-text">gross</span>/<span className="text-wolf-accent font-semibold">net</span>
      </div>
    </BottomSheet>
  );
}
