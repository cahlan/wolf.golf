'use client';

import { useState, useMemo } from 'react';
import type { Game, Standing, SkinsData } from '@/lib/types/game';
import { Label } from '@/components/ui';

interface StandingsToggleCardProps {
  game: Game;
  standings: Standing[];
  skinsData: SkinsData;
}

export function StandingsToggleCard({ game, standings, skinsData }: StandingsToggleCardProps) {
  const [tab, setTab] = useState<'wolf' | 'skins'>('wolf');
  const skinsEnabled = game.skinsEnabled !== false;

  // Find the last hole where exactly one player had the lowest net score (outright skin winner)
  const lastSkinWin = useMemo(() => {
    for (let i = game.holes.length - 1; i >= 0; i--) {
      const hole = game.holes[i];
      const entries = Object.entries(hole.netScores);
      if (entries.length === 0) continue;
      const minScore = Math.min(...entries.map(([, s]) => s));
      const winners = entries.filter(([, s]) => s === minScore);
      if (winners.length === 1) {
        let carry = 0;
        let skinsWon = 0;
        for (let j = 0; j <= i; j++) {
          const h = game.holes[j];
          const ent = Object.entries(h.netScores);
          if (ent.length === 0) continue;
          const min = Math.min(...ent.map(([, s]) => s));
          const w = ent.filter(([, s]) => s === min);
          if (w.length === 1) {
            skinsWon = 1 + carry;
            carry = 0;
          } else {
            carry += 1;
          }
        }
        return { player: winners[0][0], holeNum: hole.holeNum, count: skinsWon };
      }
    }
    return null;
  }, [game.holes]);

  return (
    <div className="bg-wolf-card rounded-xl border border-wolf-border p-3.5 mb-4">
      {/* Header: Label + optional tab pills */}
      {skinsEnabled ? (
        <div className="flex items-center justify-between mb-2">
          <Label>
            STANDINGS{game.holes.length > 0 ? ` — ${game.holes.length} HOLES` : ''}
          </Label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTab('wolf')}
              className={`py-0.5 px-2.5 rounded-full font-mono text-[10px] tracking-[1.5px] uppercase border-none cursor-pointer transition-colors
                ${tab === 'wolf'
                  ? 'bg-wolf-accent text-wolf-bg font-bold'
                  : 'bg-transparent text-wolf-text-muted hover:text-wolf-text'}`}
            >
              Wolf
            </button>
            <button
              onClick={() => setTab('skins')}
              className={`py-0.5 px-2.5 rounded-full font-mono text-[10px] tracking-[1.5px] uppercase border-none cursor-pointer transition-colors
                ${tab === 'skins'
                  ? 'bg-wolf-accent text-wolf-bg font-bold'
                  : 'bg-transparent text-wolf-text-muted hover:text-wolf-text'}`}
            >
              Skins
            </button>
          </div>
        </div>
      ) : (
        <Label className="mb-2">
          STANDINGS{game.holes.length > 0 ? ` — ${game.holes.length} HOLES` : ''}
        </Label>
      )}

      {/* Wolf standings */}
      {tab === 'wolf' && (
        <div>
          {standings.map((s, i) => (
            <div
              key={s.name}
              className={`flex justify-between py-[5px]
                ${i > 0 ? 'border-t border-wolf-border' : ''}`}
            >
              <span className={`${i === 0 && s.points > 0 ? 'text-wolf-accent font-semibold' : 'text-wolf-text'}`}>
                {i === 0 && s.points > 0 ? '👑 ' : ''}{s.name}
              </span>
              <span className={`font-mono font-bold ${s.points > 0 ? 'text-wolf-accent' : 'text-wolf-text-muted'}`}>
                {s.points}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Skins summary */}
      {tab === 'skins' && (
        <div>
          {/* Carryover line */}
          {skinsData.carryover > 0 && (
            <div className="flex items-center gap-1.5 mb-2 text-[13px] text-wolf-orange font-semibold">
              <span>🔥</span>
              <span>{skinsData.carryover} skin{skinsData.carryover !== 1 ? 's' : ''} on the line</span>
            </div>
          )}

          {/* Last winner line */}
          <div className="text-[12px] text-wolf-text-sec mb-3">
            {lastSkinWin
              ? `Last won: ${lastSkinWin.player} on H${lastSkinWin.holeNum}${lastSkinWin.count > 1 ? ` (×${lastSkinWin.count})` : ''}`
              : 'No skins yet'}
          </div>

          {/* Skins grid — 2 columns */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-[5px]">
            {game.players.map(p => (
              <div key={p} className="flex justify-between">
                <span className={`text-[13px] ${skinsData.skins[p] > 0 ? 'text-wolf-text' : 'text-wolf-text-muted'}`}>
                  {p}
                </span>
                <span className={`font-mono font-bold text-[13px]
                  ${skinsData.skins[p] > 0 ? 'text-wolf-accent' : 'text-wolf-text-muted'}`}>
                  {skinsData.skins[p]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
