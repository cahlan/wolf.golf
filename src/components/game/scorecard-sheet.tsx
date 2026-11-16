'use client';

import { useState } from 'react';
import type { Game } from '@/lib/types/game';
import { HOLES_PER_ROUND, getPlayerStrokesOnHole, calculateHandicapNet } from '@/lib/engine';
import { BottomSheet, Label, StrokeDots } from '@/components/ui';

type ScoreView = 'gross' | 'net';

function sum(vals: number[]) {
  return vals.reduce((a, b) => a + b, 0);
}

function formatToPar(n: number) {
  return n === 0 ? 'E' : n > 0 ? `+${n}` : `${n}`;
}

export function ScorecardSheet({ game, open, onClose }: { game: Game; open: boolean; onClose: () => void }) {
  const [view, setView] = useState<ScoreView>('gross');
  const [showHandicapNet, setShowHandicapNet] = useState(false);
  const handicapNet = calculateHandicapNet(game);
  const holes = Array.from({ length: HOLES_PER_ROUND }, (_, i) => i + 1);

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
        </div>
        <div className="flex rounded-[8px] border border-wolf-border overflow-hidden text-[11px] font-mono">
          {(['gross', 'net'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 border-none cursor-pointer transition-colors
                ${view === v ? 'bg-wolf-accent text-wolf-bg font-semibold' : 'bg-transparent text-wolf-text-muted'}`}
            >
              {v === 'gross' ? 'Gross' : 'Net'}
            </button>
          ))}
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
              <th className="sticky left-0 z-10 bg-wolf-card py-2 px-2.5 text-left text-wolf-text-muted font-medium">Player</th>
              {holes.map((hNum) => {
                const par = game.course.holes[hNum - 1]?.par;
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
                <td className="sticky left-0 z-10 bg-wolf-card py-2 px-2.5 text-wolf-text whitespace-nowrap">
                  <div className="font-semibold">{p}</div>
                  <div className="text-[10px] text-wolf-text-muted">{game.handicaps[p]} HC</div>
                </td>

                {holes.map((hNum) => {
                  const hole = holeByNum.get(hNum);
                  const g = hole?.grossScores?.[p];
                  const n = hole?.netScores?.[p];
                  const played = typeof g === 'number' && typeof n === 'number';
                  const score = view === 'gross' ? g : n;
                  const underPar = played && hole && score! < hole.par;
                  return (
                    <td key={hNum} className="py-2 px-2 text-center whitespace-nowrap align-top">
                      {played ? (
                        <div className={underPar ? 'text-wolf-accent font-semibold' : 'text-wolf-text'}>{score}</div>
                      ) : (
                        <div className="text-wolf-text-muted">·</div>
                      )}
                      {/* Fixed-height slot keeps rows even across players and views; in gross view
                          dots also show strokes on holes not yet played */}
                      <div className="h-1.5 mt-1 flex justify-center">
                        {view === 'gross' && <StrokeDots count={getPlayerStrokesOnHole(game, p, hNum)} />}
                      </div>
                    </td>
                  );
                })}

                <td className="py-2 px-2 text-center whitespace-nowrap">
                  <span className="text-wolf-text font-semibold">{totals[p][view]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-[11px] font-mono text-wolf-text-muted">
        {view === 'gross'
          ? <>Dots mark holes where a player gets a stroke. <span className="text-wolf-accent font-semibold">Green</span> = under par.</>
          : <>Net = gross minus strokes. <span className="text-wolf-accent font-semibold">Green</span> = under par.</>}
      </div>

      {/* Full-handicap net: how each player is doing vs their own handicap (not the match) */}
      <button
        onClick={() => setShowHandicapNet(v => !v)}
        className="mt-3 bg-transparent border-none text-wolf-accent text-[12px] font-mono cursor-pointer p-0 flex items-center gap-1"
      >
        <span>{showHandicapNet ? '▾' : '▸'}</span>
        <span>Net vs handicap</span>
      </button>
      {showHandicapNet && (
        <div className="mt-2">
          <div className="rounded-[10px] border border-wolf-border overflow-hidden">
            <table className="w-full border-collapse text-[12px] font-mono">
              <thead>
                <tr className="bg-wolf-card text-wolf-text-muted text-[11px]">
                  <th className="py-2 px-2.5 text-left font-medium">Player</th>
                  <th className="py-2 px-2 text-center font-medium">Thru</th>
                  <th className="py-2 px-2 text-center font-medium">Gross</th>
                  <th className="py-2 px-2 text-center font-medium">Net</th>
                  <th className="py-2 px-2 text-center font-medium">vs Par</th>
                </tr>
              </thead>
              <tbody>
                {game.players.map(p => {
                  const r = handicapNet[p];
                  return (
                    <tr key={p} className="border-t border-wolf-border">
                      <td className="py-2 px-2.5 text-wolf-text font-semibold whitespace-nowrap">{p}</td>
                      <td className="py-2 px-2 text-center text-wolf-text-muted">{r.holesPlayed}</td>
                      <td className="py-2 px-2 text-center text-wolf-text">{r.holesPlayed ? r.gross : '·'}</td>
                      <td className="py-2 px-2 text-center text-wolf-text">{r.holesPlayed ? r.net : '·'}</td>
                      <td className={`py-2 px-2 text-center font-semibold ${r.toPar < 0 ? 'text-wolf-accent' : 'text-wolf-text'}`}>
                        {r.holesPlayed ? formatToPar(r.toPar) : '·'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-[11px] font-mono text-wolf-text-muted">
            Net using each player&apos;s full handicap — how you&apos;re playing vs your handicap.
            The match uses strokes off the low man (Net view above).
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
