'use client';

import type { Game, CompletedHole } from '@/lib/types/game';
import { getPlayerStrokesOnHole } from '@/lib/engine';
import { calculateSixHolePoints, getSixHoleMatchupDetail, getTeamsForHole } from '@/lib/engine/six';
import { Label, StrokeDots } from '@/components/ui';

export function SixHoleResultDetail({ game, hole }: { game: Game; hole: CompletedHole }) {
  const { teamA, teamB } = getTeamsForHole(game, hole.holeNum);
  const pts = calculateSixHolePoints(hole, teamA, teamB);
  const detail = getSixHoleMatchupDetail(hole, teamA, teamB);

  function renderPlayerRow(p: string, idx: number, bgBorder: string) {
    const strokes = getPlayerStrokesOnHole(game, p, hole.holeNum);
    const gross = hole.grossScores[p];
    const net = hole.netScores[p];

    return (
      <div
        key={p}
        className={`flex items-center justify-between py-1.5
          ${idx > 0 ? `border-t ${bgBorder}` : ''}`}
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

  const resultLabel = (result: 'teamA' | 'teamB' | 'push') =>
    result === 'teamA' ? 'A WIN' : result === 'teamB' ? 'B WIN' : 'PUSH';
  const resultStyle = (result: 'teamA' | 'teamB' | 'push') =>
    result === 'push'
      ? 'bg-wolf-elevated text-wolf-text-muted'
      : 'bg-wolf-accent/10 text-wolf-accent';

  return (
    <div>
      {/* Team A */}
      <div className="bg-wolf-accent-bg rounded-xl border border-wolf-accent/20 p-3.5 mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-xs font-mono text-wolf-accent font-semibold tracking-[1.5px]">
            TEAM A
          </div>
          <div className="flex gap-3 text-[10px] font-mono text-wolf-text-muted tracking-wider">
            <span>GRS</span>
            <span>NET</span>
          </div>
        </div>
        {teamA.map((p, i) => renderPlayerRow(p, i, 'border-wolf-accent/10'))}
      </div>

      {/* VS divider */}
      <div className="text-center py-1 mb-3 relative">
        <div className="absolute top-1/2 left-0 right-0 border-t border-wolf-border" />
        <span className="relative bg-wolf-bg px-3.5 text-xs font-mono text-wolf-text-muted font-semibold tracking-[2px]">
          VS
        </span>
      </div>

      {/* Team B */}
      <div className="bg-wolf-card rounded-xl border border-wolf-border p-3.5 mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-xs font-mono text-wolf-text-sec font-semibold tracking-[1.5px]">
            TEAM B
          </div>
          <div className="flex gap-3 text-[10px] font-mono text-wolf-text-muted tracking-wider">
            <span>GRS</span>
            <span>NET</span>
          </div>
        </div>
        {teamB.map((p, i) => renderPlayerRow(p, i, 'border-wolf-border'))}
      </div>

      {/* Hi/Low breakdown */}
      <div className="bg-wolf-accent-bg rounded-[10px] border border-wolf-accent/20 p-3.5">
        <Label className="text-wolf-accent mb-2">HI / LOW BREAKDOWN</Label>

        {/* Low ball */}
        <div className="flex items-center justify-between py-1.5">
          <span className="text-[13px] text-wolf-text-sec flex-1">
            Low: {detail.lowBall.teamAPlayer} ({detail.lowBall.teamANet}) vs {detail.lowBall.teamBPlayer} ({detail.lowBall.teamBNet})
          </span>
          <span className={`font-mono text-xs font-bold ml-2 py-0.5 px-2 rounded ${resultStyle(detail.lowBall.result)}`}>
            {resultLabel(detail.lowBall.result)}
          </span>
        </div>

        {/* High ball */}
        <div className="flex items-center justify-between py-1.5 border-t border-wolf-accent/10">
          <span className="text-[13px] text-wolf-text-sec flex-1">
            High: {detail.highBall.teamAPlayer} ({detail.highBall.teamANet}) vs {detail.highBall.teamBPlayer} ({detail.highBall.teamBNet})
          </span>
          <span className={`font-mono text-xs font-bold ml-2 py-0.5 px-2 rounded ${resultStyle(detail.highBall.result)}`}>
            {resultLabel(detail.highBall.result)}
          </span>
        </div>

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
