'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/providers/game-provider';
import { supabase } from '@/lib/supabase/client';
import { BackButton, Title, Sub, Button } from '@/components/ui';
import type { Game } from '@/lib/types/game';

export default function JoinPage() {
  const router = useRouter();
  const { spectateGame } = useGame();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleJoin() {
    if (code.length !== 5) return;
    setLoading(true);
    setError('');

    const { data, error: dbError } = await supabase
      .from('games')
      .select('state')
      .eq('id', code)
      .single();

    if (dbError || !data) {
      setError('Game not found. Check the code and try again.');
      setLoading(false);
      return;
    }

    spectateGame(data.state as Game);
    router.push(`/game/${code}`);
  }

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
        onClick={handleJoin}
        disabled={code.length !== 5 || loading}
        className="mt-5"
      >
        {loading ? 'Looking up game...' : 'Join as Spectator'}
      </Button>
    </div>
  );
}
