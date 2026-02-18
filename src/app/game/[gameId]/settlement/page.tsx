'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useGame } from '@/providers/game-provider';
import { supabase } from '@/lib/supabase/client';
import { calculateSettlement } from '@/lib/engine';
import { BackButton, Button, Fade, Label } from '@/components/ui';
import type { Game } from '@/lib/types/game';

export default function SettlementPage() {
  const router = useRouter();
  const params = useParams();
  const gameId = params.gameId as string;
  const { game, spectateGame } = useGame();
  const [fetchingRemote, setFetchingRemote] = useState(false);

  useEffect(() => {
    if (game) return;
    let cancelled = false;
    setFetchingRemote(true);
    supabase
      .from('games')
      .select('state')
      .eq('id', gameId)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.state) {
          spectateGame(data.state as Game);
        } else {
          router.push('/');
        }
        setFetchingRemote(false);
      });
    return () => { cancelled = true; };
  }, [gameId, game]);

  const settlement = useMemo(
    () => game ? calculateSettlement(game) : null,
    [game]
  );

  if (fetchingRemote) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <span className="text-wolf-text-muted font-mono text-sm">Loading settlement...</span>
      </div>
    );
  }

  if (!game || !settlement) {
    router.push('/');
    return null;
  }

  return (
    <div className="px-5 pt-4 pb-10">
      <BackButton href="/" />
      <Fade>
        <div className="text-center mb-6">
          <div className="text-xs font-mono text-wolf-accent tracking-[3px] mb-1.5">
            ROUND COMPLETE
          </div>
          <h1 className="text-[34px] font-extrabold font-display m-0 tracking-tight">
            Settlement
          </h1>
        </div>

        {/* Final standings */}
        <Label className="mb-2">FINAL STANDINGS</Label>
        {settlement.standings.map((s, i) => {
          const medals = ['🥇', '🥈', '', ''];
          const wolfAmt = settlement.wolfNet[s.name];
          return (
            <div
              key={s.name}
              className={`flex items-center py-3.5 px-4 rounded-xl mb-2 border
                ${i === 0 ? 'bg-wolf-accent-bg border-wolf-accent/25' : 'bg-wolf-card border-wolf-border'}`}
            >
              <span className="text-[22px] w-[34px]">{medals[i]}</span>
              <div className="flex-1">
                <div className="font-semibold text-base">{s.name}</div>
                <div className="text-xs text-wolf-text-sec font-mono">{s.points} pts</div>
              </div>
              <div className={`font-mono text-lg font-extrabold
                ${wolfAmt > 0 ? 'text-wolf-accent' : wolfAmt < 0 ? 'text-wolf-red' : 'text-wolf-text-sec'}`}>
                {wolfAmt > 0 ? '+' : ''}{wolfAmt === 0 ? 'EVEN' : `$${Math.abs(wolfAmt)}`}
              </div>
            </div>
          );
        })}

        {/* Skins summary */}
        {game.skinsEnabled !== false && (
          <>
            <Label className="mt-5 mb-2">SKINS · ${game.skinsValue}/skin</Label>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {game.players.map(p => {
                const net = settlement.skinsNet[p];
                return (
                  <div
                    key={p}
                    className="bg-wolf-card border border-wolf-border rounded-[10px] p-3 text-center"
                  >
                    <div className="text-[13px] text-wolf-text-sec">{p}</div>
                    <div className="font-mono font-bold text-base mt-1">
                      {settlement.skins[p]} skin{settlement.skins[p] !== 1 ? 's' : ''}
                    </div>
                    <div className={`font-mono text-[13px] mt-0.5
                      ${net > 0 ? 'text-wolf-accent' : net < 0 ? 'text-wolf-red' : 'text-wolf-text-muted'}`}>
                      {net > 0 ? '+' : ''}${Math.round(Math.abs(net))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* SETTLE UP */}
        <div className="bg-gradient-to-br from-wolf-accent/5 to-wolf-accent/2
          border-2 border-wolf-accent/25 rounded-2xl p-5 mb-5">
          <div className="text-sm font-mono text-wolf-accent tracking-[2px] mb-4 text-center font-bold">
            💰 SETTLE UP
          </div>

          {settlement.transfers.length === 0 ? (
            <div className="text-center text-wolf-text-sec py-4">Everyone breaks even!</div>
          ) : (
            settlement.transfers.map((t, i) => (
              <div
                key={i}
                className={`flex items-center justify-between py-3.5
                  ${i > 0 ? 'border-t border-wolf-accent/10' : ''}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-base">{t.from}</span>
                  <span className="text-wolf-text-muted text-lg">&rarr;</span>
                  <span className="font-bold text-base">{t.to}</span>
                </div>
                <div className="font-mono text-2xl font-extrabold text-wolf-accent">
                  ${t.amount}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Net totals */}
        <Label className="mb-2">NET TOTAL{game.skinsEnabled !== false ? ' (WOLF + SKINS)' : ''}</Label>
        {game.players.map(p => {
          const net = settlement.totalNet[p];
          return (
            <div
              key={p}
              className="flex justify-between py-2.5 px-3.5 bg-wolf-card border border-wolf-border
                rounded-lg mb-1.5"
            >
              <span className="font-medium">{p}</span>
              <span className={`font-mono font-extrabold text-base
                ${net > 0 ? 'text-wolf-accent' : net < 0 ? 'text-wolf-red' : 'text-wolf-text-sec'}`}>
                {net > 0 ? '+' : net < 0 ? '-' : ''}${Math.round(Math.abs(net))}
              </span>
            </div>
          );
        })}

        <Button variant="primary" onClick={() => router.push('/weekend/current')} className="mt-5">
          Weekend Standings &rarr;
        </Button>
      </Fade>
    </div>
  );
}
