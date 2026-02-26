'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/providers/game-provider';
import { calculateWeekendStandings, calculateStandings } from '@/lib/engine';
import { BackButton, Button, Fade, Label, BottomSheet } from '@/components/ui';

export default function WeekendPage() {
  const router = useRouter();
  const { weekendGames, resetWeekend } = useGame();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const weekendStandings = calculateWeekendStandings(weekendGames);

  return (
    <div className="px-5 pt-4 pb-10">
      <BackButton href="/" />
      <Fade>
        <div className="text-center mb-6">
          <div className="text-xs font-mono text-wolf-gold tracking-[3px] mb-1.5">
            🏆 WEEKEND
          </div>
          <h1 className="text-[34px] font-extrabold font-display m-0 tracking-tight">
            Overall Standings
          </h1>
          <p className="text-wolf-text-sec text-sm mt-1.5">
            {weekendGames.length} round{weekendGames.length !== 1 ? 's' : ''} played
          </p>
        </div>

        {weekendStandings.length === 0 ? (
          <div className="text-center text-wolf-text-muted py-10">No rounds completed yet.</div>
        ) : (
          weekendStandings.map((s, i) => {
            const bgColors = ['bg-wolf-gold', 'bg-wolf-silver', 'bg-wolf-bronze', 'bg-wolf-hover'];
            const textColors = [
              'text-wolf-bg', 'text-wolf-bg', 'text-wolf-bg', 'text-wolf-text-sec',
            ];
            return (
              <div
                key={s.name}
                className={`flex items-center p-4 rounded-xl mb-2 border
                  ${i === 0
                    ? 'bg-gradient-to-br from-wolf-gold/7 to-wolf-gold/2 border-wolf-gold/25'
                    : 'bg-wolf-card border-wolf-border'}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center
                  font-extrabold font-mono text-base mr-3.5
                  ${bgColors[i] || 'bg-wolf-hover'} ${textColors[i] || 'text-wolf-text-sec'}`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-[17px]">{s.name}</div>
                </div>
                <div className={`font-mono text-[28px] font-extrabold
                  ${i === 0 ? 'text-wolf-gold' : 'text-wolf-text'}`}>
                  {s.points}
                </div>
              </div>
            );
          })
        )}

        {weekendGames.length > 0 && (
          <div className="mt-5">
            <Label className="mb-2">ROUND RESULTS</Label>
            {weekendGames.map((game, gi) => {
              const standings = calculateStandings(game);
              return (
                <div
                  key={gi}
                  className="bg-wolf-card border border-wolf-border rounded-[10px] p-3.5 mb-2"
                >
                  <div className="text-[13px] font-mono text-wolf-text-sec mb-2">
                    Round {gi + 1} · {game.course.name}
                  </div>
                  {standings.map((s, i) => (
                    <div
                      key={s.name}
                      className={`flex justify-between text-sm py-[3px]
                        ${i === 0 ? 'text-wolf-accent' : 'text-wolf-text'}`}
                    >
                      <span>{i + 1}. {s.name}</span>
                      <span className="font-mono">
                        {s.points > 0 ? '+' : ''}{s.points} pts &rarr; {[4, 3, 2, 1][i]} wknd
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
        {weekendGames.length > 0 && (
          <div className="mt-8">
            <Button onClick={() => setShowResetConfirm(true)}>
              Start Fresh Weekend
            </Button>
          </div>
        )}

        <BottomSheet open={showResetConfirm} onClose={() => setShowResetConfirm(false)}>
          <div className="text-lg font-bold mb-2">Start fresh?</div>
          <p className="text-wolf-text-sec text-sm mt-0 mb-5">
            This will clear all games from this weekend. Are you sure?
          </p>
          <Button variant="primary" onClick={() => setShowResetConfirm(false)}>
            Keep Weekend
          </Button>
          <button
            onClick={() => {
              setShowResetConfirm(false);
              resetWeekend();
              router.push('/');
            }}
            className="w-full py-2.5 bg-transparent border-none text-wolf-red text-[13px] cursor-pointer mt-2"
          >
            Clear all games and start fresh
          </button>
        </BottomSheet>
      </Fade>
    </div>
  );
}
