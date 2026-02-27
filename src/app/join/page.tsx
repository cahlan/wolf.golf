'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGame } from '@/providers/game-provider';
import { supabase } from '@/lib/supabase/client';
import { BackButton, Title, Sub, Button } from '@/components/ui';
import type { Game } from '@/lib/types/game';

function JoinPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { spectateGame } = useGame();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoinWithCode = useCallback(async (joinCode: string) => {
    if (joinCode.length !== 5) return;
    setLoading(true);
    setError('');

    const { data, error: dbError } = await supabase
      .from('games')
      .select('state')
      .eq('id', joinCode)
      .single();

    if (dbError || !data) {
      setError('Game not found. Check the code and try again.');
      setLoading(false);
      return;
    }

    spectateGame(data.state as Game);
    router.push(`/game/${joinCode}`);
  }, [spectateGame, router]);

  // Auto-join if ?code=XXXXX is in the URL
  useEffect(() => {
    const c = searchParams.get('code')?.toUpperCase().slice(0, 5);
    if (c && c.length === 5) {
      setCode(c);
      handleJoinWithCode(c);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  return (
    <div className="px-5 pt-4">
      <BackButton href="/" />
      <Title>Join Round</Title>
      <Sub>Enter the 5-letter code from the scorekeeper.</Sub>
      <input
        type="text"
        placeholder="ABCDE"
        value={code}
        onChange={e => {
          setCode(e.target.value.toUpperCase().slice(0, 5));
          setError('');
        }}
        maxLength={5}
        className="w-full text-center text-[32px] tracking-[10px] font-mono py-[18px]
          bg-wolf-card border border-wolf-border rounded-[10px] text-wolf-text outline-none"
      />
      {error && (
        <p className="text-wolf-red text-[13px] text-center mt-3">{error}</p>
      )}
      <Button
        variant="primary"
        onClick={() => handleJoinWithCode(code)}
        disabled={code.length !== 5 || loading}
        className="mt-5"
      >
        {loading ? 'Looking up game...' : 'Join as Spectator'}
      </Button>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="px-5 pt-4">
        <div className="text-wolf-text-muted font-mono text-sm text-center mt-10">Loading...</div>
      </div>
    }>
      <JoinPageInner />
    </Suspense>
  );
}
