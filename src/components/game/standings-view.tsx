'use client';

import type { Game, Standing } from '@/lib/types/game';
import { calculateHolePoints } from '@/lib/engine';
import { Fade, Label, Title } from '@/components/ui';

interface StandingsViewProps {
  game: Game;
  standings: Standing[];
}

export function StandingsView({ game, standings }: StandingsViewProps) {
  return (
    <Fade>
      <Title>Wolf Standings</Title>
      {standings.map((s, i) => (
        <div
          key={s.name}
          className={`flex items-center py-3.5 px-4 rounded-xl mb-2 border
            ${i === 0 ? 'bg-wolf-accent-bg border-wolf-accent/20' : 'bg-wolf-card border-wolf-border'}`}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center
            font-extrabold font-mono text-sm mr-3
            ${i === 0 ? 'bg-wolf-accent text-wolf-bg' : 'bg-wolf-hover text-wolf-text-sec'}`}>
            {i + 1}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-base">{s.name}</div>
          </div>
          <div className={`font-mono text-[26px] font-extrabold
            ${s.points > 0 ? 'text-wolf-accent' : 'text-wolf-text-sec'}`}>
            {s.points}
          </div>
        </div>
      ))}

      {game.holes.length > 0 && (
        <div className="mt-5">
          <Label className="mb-2">HOLE-BY-HOLE</Label>
          <div className="overflow-x-auto rounded-[10px] border border-wolf-border">
            <table className="w-full border-collapse text-[13px] font-mono">
              <thead>
                <tr className="bg-wolf-card">
                  <th className="py-2 px-2.5 text-left text-wolf-text-muted font-medium">#</th>
                  {game.players.map(p => (
                    <th key={p} className="py-2 px-1.5 text-center text-wolf-text-sec font-medium text-[11px]">
                      {p.slice(0, 4)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {game.holes.map(hole => {
                  const pts = calculateHolePoints(hole);
                  return (
                    <tr key={hole.holeNum} className="border-t border-wolf-border">
                      <td className="py-1.5 px-2.5 text-wolf-text-muted">{hole.holeNum}</td>
                      {game.players.map(p => (
                        <td
                          key={p}
                          className={`py-1.5 px-1.5 text-center
                            ${pts[p] > 0 ? 'text-wolf-accent font-bold' : 'text-wolf-text-muted'}`}
                        >
                          {pts[p] > 0 ? pts[p] : '·'}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Fade>
  );
}
