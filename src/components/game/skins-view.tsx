'use client';

import type { Game, SkinsData } from '@/lib/types/game';
import { Fade, Label, Title } from '@/components/ui';

interface SkinsViewProps {
  game: Game;
  skinsData: SkinsData;
}

export function SkinsView({ game, skinsData }: SkinsViewProps) {
  return (
    <Fade>
      <Title>Skins</Title>
      <div className="grid grid-cols-2 gap-2 mb-5">
        {game.players.map(p => (
          <div
            key={p}
            className="bg-wolf-card border border-wolf-border rounded-[10px] p-3.5 text-center"
          >
            <div className="text-[13px] text-wolf-text-sec mb-1">{p}</div>
            <div className={`text-[30px] font-extrabold font-mono
              ${skinsData.skins[p] > 0 ? 'text-wolf-accent' : 'text-wolf-text-muted'}`}>
              {skinsData.skins[p]}
            </div>
            <div className="text-[11px] text-wolf-text-muted font-mono">SKINS</div>
          </div>
        ))}
      </div>

      {skinsData.carryover > 0 && (
        <div className="bg-wolf-orange-bg border border-wolf-orange/20 rounded-[10px] py-2.5 px-3.5
          text-center mb-4">
          <span className="text-wolf-orange font-semibold">
            {skinsData.carryover} skin{skinsData.carryover > 1 ? 's' : ''} carrying over
          </span>
        </div>
      )}

      {game.holes.length > 0 && (
        <>
          <Label className="mb-2">HOLE-BY-HOLE NET</Label>
          {game.holes.map(hole => {
            const scores = Object.entries(hole.netScores).sort((a, b) => a[1] - b[1]);
            const minScore = scores[0][1];
            const isSkin = scores.filter(([, s]) => s === minScore).length === 1;
            const winner = isSkin ? scores[0][0] : null;

            return (
              <div
                key={hole.holeNum}
                className={`flex items-center py-[7px] px-3 rounded-lg mb-[5px] text-[13px] border
                  ${winner
                    ? 'bg-wolf-accent-bg border-wolf-accent/20'
                    : 'bg-wolf-card border-wolf-border'}`}
              >
                <span className="font-mono text-wolf-text-muted w-7 text-xs">
                  {hole.holeNum}
                </span>
                <div className="flex-1 flex gap-2.5">
                  {scores.map(([name, score]) => (
                    <span
                      key={name}
                      className={`font-mono
                        ${name === winner ? 'text-wolf-accent font-bold' : 'text-wolf-text-sec'}`}
                    >
                      {name.slice(0, 4)}:{score}
                    </span>
                  ))}
                </div>
                <span className={`text-[11px] font-semibold
                  ${winner ? 'text-wolf-accent' : 'text-wolf-text-muted'}`}>
                  {winner ? 'SKIN' : 'push'}
                </span>
              </div>
            );
          })}
        </>
      )}
    </Fade>
  );
}
