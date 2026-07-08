'use client';

import { useMemo } from 'react';
import type { Game, HoleInfo } from '@/lib/types/game';
import { getPlayerStrokesOnHole } from '@/lib/engine';
import { calculateSixHolePoints, getSixHoleMatchupDetail } from '@/lib/engine/six';
import { Button, Fade, Label, StrokeDots, VsDivider, HolePointsTotals } from '@/components/ui';

interface SixHoleInputProps {
  game: Game;
  holeNum: number;
  teamA: [string, string];
  teamB: [string, string];
  grossScores: Record<string, string>;
  setGrossScores: (scores: Record<string, string>) => void;
  strokesThisHole: Record<string, number>;
  holeInfo: HoleInfo;
  onSubmit: () => void;
  onCancel: () => void;
}

export function SixHoleInput({
  game, holeNum, teamA, teamB, grossScores, setGrossScores,
  strokesThisHole, holeInfo, onSubmit, onCancel,
}: SixHoleInputProps) {
  function updateScore(player: string, value: string) {
    setGrossScores({ ...grossScores, [player]: value });
  }

  function getEffectiveGross(player: string): number {
    const val = grossScores[player];
    if (val === '' || val === undefined) return holeInfo.par;
    return parseInt(val) || holeInfo.par;
  }

  const { previewPoints, matchupDetail } = useMemo(() => {
    const netScores: Record<string, number> = {};
    game.players.forEach(p => {
      netScores[p] = getEffectiveGross(p) - getPlayerStrokesOnHole(game, p, holeNum);
    });
    const completedHole = {
      holeNum,
      par: holeInfo.par,
      strokeIndex: holeInfo.strokeIndex,
      wolf: teamA[0],
      partner: teamA[1],
      loneWolf: null,
      players: game.players,
      grossScores: Object.fromEntries(
        game.players.map(p => [p, getEffectiveGross(p)])
      ),
      netScores,
    };
    return {
      previewPoints: calculateSixHolePoints(completedHole, teamA, teamB),
      matchupDetail: getSixHoleMatchupDetail(completedHole, teamA, teamB),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grossScores, game, holeNum]);

  function renderPlayerRow(p: string) {
    const strokes = strokesThisHole[p];
    const gross = getEffectiveGross(p);
    const net = gross - strokes;

    return (
      <div key={p} className="flex items-center gap-1.5 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-base flex items-center gap-1 text-wolf-text">
            {p}
            <StrokeDots count={strokes} className="ml-0.5" />
          </div>
        </div>
        <Button
          variant="score"
          onClick={() => {
            const curr = parseInt(grossScores[p]) || holeInfo.par;
            updateScore(p, String(Math.max(1, curr - 1)));
          }}
        >
          &minus;
        </Button>
        <input
          type="number"
          value={grossScores[p]}
          onChange={e => updateScore(p, e.target.value)}
          placeholder={String(holeInfo.par)}
          className="w-12 text-center py-2.5 px-0.5 bg-wolf-card border border-wolf-border
            rounded-lg text-wolf-text text-xl font-mono font-extrabold outline-none"
        />
        <Button
          variant="score"
          onClick={() => {
            const curr = parseInt(grossScores[p]) || holeInfo.par;
            updateScore(p, String(curr + 1));
          }}
        >
          +
        </Button>
        <div className={`w-8 text-center font-mono text-[15px] font-bold
          ${strokes > 0 ? 'text-wolf-accent' : 'text-wolf-text-sec'}`}>
          {net}
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
    <Fade>
      <div className="text-center mb-3 text-xs font-mono text-wolf-text-muted tracking-[2px]">
        HOLE {holeNum} · PAR {holeInfo.par} · SI {holeInfo.strokeIndex}
      </div>

      {/* Team A */}
      <div className="bg-wolf-accent-bg rounded-xl border border-wolf-accent/20 pt-2.5 px-3.5 pb-1.5 mb-3">
        <div className="text-xs font-mono text-wolf-accent font-semibold tracking-[1.5px] mb-2">
          TEAM A
        </div>
        {teamA.map(renderPlayerRow)}
      </div>

      <VsDivider />

      {/* Team B */}
      <div className="bg-wolf-card rounded-xl border border-wolf-border pt-2.5 px-3.5 pb-1.5 mb-3">
        <div className="text-xs font-mono text-wolf-text-sec font-semibold tracking-[1.5px] mb-2">
          TEAM B
        </div>
        {teamB.map(renderPlayerRow)}
      </div>

      {/* Hi/Low preview */}
      <div className="bg-wolf-accent-bg rounded-[10px] border border-wolf-accent/20 p-3.5 mt-3">
        <Label className="text-wolf-accent mb-2">HI / LOW BREAKDOWN</Label>

        {/* Low ball */}
        <div className="flex items-center justify-between py-1.5">
          <span className="text-[13px] text-wolf-text-sec flex-1">
            Low: {matchupDetail.lowBall.teamAPlayer} ({matchupDetail.lowBall.teamANet}) vs {matchupDetail.lowBall.teamBPlayer} ({matchupDetail.lowBall.teamBNet})
          </span>
          <span className={`font-mono text-xs font-bold ml-2 py-0.5 px-2 rounded ${resultStyle(matchupDetail.lowBall.result)}`}>
            {resultLabel(matchupDetail.lowBall.result)}
          </span>
        </div>

        {/* High ball */}
        <div className="flex items-center justify-between py-1.5 border-t border-wolf-accent/10">
          <span className="text-[13px] text-wolf-text-sec flex-1">
            High: {matchupDetail.highBall.teamAPlayer} ({matchupDetail.highBall.teamANet}) vs {matchupDetail.highBall.teamBPlayer} ({matchupDetail.highBall.teamBNet})
          </span>
          <span className={`font-mono text-xs font-bold ml-2 py-0.5 px-2 rounded ${resultStyle(matchupDetail.highBall.result)}`}>
            {resultLabel(matchupDetail.highBall.result)}
          </span>
        </div>

        <div className="mt-2.5 pt-2.5 border-t border-wolf-accent/20 text-center text-sm font-bold text-wolf-text">
          {matchupDetail.summary}
        </div>

        <HolePointsTotals players={game.players} points={previewPoints} />
      </div>

      <div className="flex gap-2.5 mt-5">
        <Button onClick={onCancel} className="flex-1">
          &larr; Cancel
        </Button>
        <Button variant="primary" onClick={onSubmit} className="flex-[2]">
          Confirm &#10003;
        </Button>
      </div>
    </Fade>
  );
}
