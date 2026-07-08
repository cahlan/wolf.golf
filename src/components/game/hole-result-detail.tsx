'use client';

import type { Game, CompletedHole } from '@/lib/types/game';
import { calculateHolePoints, getHoleMatchupDetail, getPlayerStrokesOnHole } from '@/lib/engine';
import { LONE_WOLF_POINTS } from '@/lib/engine/constants';
import { Label, StrokeDots } from '@/components/ui';

export function HoleResultDetail({ game, hole }: { game: Game; hole: CompletedHole }) {
  const pts = calculateHolePoints(hole);
  const detail = getHoleMatchupDetail(hole);

  const isLone = !!hole.loneWolf;
  const wolfTeam = isLone ? [hole.wolf] : [hole.wolf, hole.partner!];
  const opponentTeam = game.players.filter(p => !wolfTeam.includes(p));

  function renderPlayerRow(p: string, idx: number) {
    const strokes = getPlayerStrokesOnHole(game, p, hole.holeNum);
    const isWolf = p === hole.wolf;
    const gross = hole.grossScores[p];
    const net = hole.netScores[p];

    return (
      <div
        key={p}
        className={`flex items-center justify-between py-1.5
          ${idx > 0 ? 'border-t border-wolf-orange/10' : ''}`}
      >
        <div className="flex items-center gap-1.5">
          <span className={`text-base ${isWolf ? 'font-bold text-wolf-orange' : 'text-wolf-text'}`}>
            {p}
          </span>
          {isWolf && <span className="text-[13px]">🐺</span>}
          <StrokeDots count={strokes} className="ml-0.5" />
        </div>
        <div className="flex items-center gap-3 font-mono">
          <span className="text-[13px] text-wolf-text-muted">{gross}</span>
          <span className={`text-[15px] font-bold ${strokes > 0 ? 'text-wolf-accent' : 'text-wolf-text-sec'}`}>
            {net}
          </span>
        </div>
      </div>
    );
  }

  function renderOpponentRow(p: string, idx: number) {
    const strokes = getPlayerStrokesOnHole(game, p, hole.holeNum);
    const gross = hole.grossScores[p];
    const net = hole.netScores[p];

    return (
      <div
        key={p}
        className={`flex items-center justify-between py-1.5
          ${idx > 0 ? 'border-t border-wolf-border' : ''}`}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-base text-wolf-text">{p}</span>
          <StrokeDots count={strokes} className="ml-0.5" />
        </div>
        <div className="flex items-center gap-3 font-mono">
          <span className="text-[13px] text-wolf-text-muted">{gross}</span>
          <span className={`text-[15px] font-bold ${strokes > 0 ? 'text-wolf-accent' : 'text-wolf-text-sec'}`}>
            {net}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Wolf team */}
      <div className="bg-wolf-orange-bg rounded-xl border border-wolf-orange/20 p-3.5 mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-xs font-mono text-wolf-orange font-semibold tracking-[1.5px] flex items-center gap-1.5">
            🐺 {isLone ? 'LONE WOLF' : 'WOLF TEAM'}
          </div>
          {isLone && (
            <span className="text-[11px] font-mono text-wolf-orange bg-wolf-orange/10 py-0.5 px-2 rounded">
              +{LONE_WOLF_POINTS[hole.loneWolf!]} to win
            </span>
          )}
          <div className="flex gap-3 text-[10px] font-mono text-wolf-text-muted tracking-wider">
            <span>GRS</span>
            <span>NET</span>
          </div>
        </div>
        {wolfTeam.map((p, i) => renderPlayerRow(p, i))}
      </div>

      {/* VS divider */}
      <div className="text-center py-1 mb-3 relative">
        <div className="absolute top-1/2 left-0 right-0 border-t border-wolf-border" />
        <span className="relative bg-wolf-bg px-3.5 text-xs font-mono text-wolf-text-muted font-semibold tracking-[2px]">
          VS
        </span>
      </div>

      {/* Opponent team */}
      <div className="bg-wolf-card rounded-xl border border-wolf-border p-3.5 mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-xs font-mono text-wolf-text-sec font-semibold tracking-[1.5px]">
            {isLone ? 'THE FIELD' : 'OPPONENTS'}
          </div>
          <div className="flex gap-3 text-[10px] font-mono text-wolf-text-muted tracking-wider">
            <span>GRS</span>
            <span>NET</span>
          </div>
        </div>
        {opponentTeam.map((p, i) => renderOpponentRow(p, i))}
      </div>

      {/* Matchup breakdown */}
      <div className="bg-wolf-accent-bg rounded-[10px] border border-wolf-accent/20 p-3.5">
        <Label className="text-wolf-accent mb-2">MATCHUP BREAKDOWN</Label>

        {detail.lines.map((line, i) => (
          <div
            key={i}
            className={`flex items-center justify-between py-1.5
              ${i > 0 ? 'border-t border-wolf-accent/10' : ''}`}
          >
            <span className="text-[13px] text-wolf-text-sec flex-1">{line.label}</span>
            <span className={`font-mono text-xs font-bold ml-2 py-0.5 px-2 rounded
              ${line.result === 'wolf' ? 'bg-wolf-accent/10 text-wolf-accent' :
                line.result === 'opp' || line.result === 'field' ? 'bg-wolf-red/10 text-wolf-red' :
                'bg-wolf-elevated text-wolf-text-muted'}`}>
              {line.result === 'wolf' ? '🐺 WIN' :
               line.result === 'opp' || line.result === 'field' ? 'LOSS' : 'PUSH'}
            </span>
          </div>
        ))}

        <div className="mt-2.5 pt-2.5 border-t border-wolf-accent/20 text-center text-sm font-bold text-wolf-text">
          {detail.summary}
        </div>

        <div className="flex justify-around mt-2.5">
          {game.players.map(p => {
            const points = pts[p];
            return (
              <div key={p} className="text-center">
                <div className="text-[11px] text-wolf-text-muted">{p.slice(0, 5)}</div>
                <div className={`font-mono font-extrabold text-lg
                  ${points > 0 ? 'text-wolf-accent' : 'text-wolf-text-muted'}`}>
                  {points > 0 ? `+${points}` : '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
