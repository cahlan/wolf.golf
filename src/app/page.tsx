'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGame } from '@/providers/game-provider';
import { createTestGame } from '@/lib/test-data';
import { Button, Fade } from '@/components/ui';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasActiveGame, resumeGame, weekendGames, setGame, setIsScorekeeper } = useGame();
  const testTriggered = useRef(false);

  useEffect(() => {
    if (searchParams.get('test') === '1' && !testTriggered.current) {
      testTriggered.current = true;
      const game = createTestGame();
      setGame(game);
      setIsScorekeeper(true);
      router.replace(`/game/${game.id}`);
    }
  }, [searchParams, setGame, setIsScorekeeper, router]);

  const handleResume = () => {
    const game = resumeGame();
    if (game) router.push(`/game/${game.id}`);
  };

  return (
    <div className="px-5 pt-14">
      <Fade>
        <div className="text-center mb-11">
          <div className="text-[40px] mb-2">🐺</div>
          <div className="text-xs tracking-[5px] text-wolf-accent font-mono font-medium mb-3.5">
            WOLF TRACKER
          </div>
          <h1 className="text-[38px] font-extrabold m-0 leading-[1.05] font-display tracking-[-1.5px]">
            Settle the<br />score.
          </h1>
          <p className="text-wolf-text-sec mt-3.5 text-[15px] leading-relaxed">
            Wolf &middot; Skins &middot; Settlements<br />No more napkin math.
          </p>
        </div>

        {hasActiveGame && (
          <Button variant="primary" onClick={handleResume} className="mb-2.5">
            Resume Round &rarr;
          </Button>
        )}
        <Button
          variant={hasActiveGame ? 'secondary' : 'primary'}
          onClick={() => router.push('/create')}
        >
          New Round
        </Button>
        <Button onClick={() => router.push('/join')} className="mt-2.5">
          Join Round
        </Button>
        {weekendGames.length > 0 && (
          <Button
            onClick={() => router.push('/weekend/current')}
            className="mt-2.5 !border-wolf-gold"
          >
            <span className="text-wolf-gold">🏆 Weekend Standings</span>
          </Button>
        )}
      </Fade>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
