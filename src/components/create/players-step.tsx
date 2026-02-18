'use client';

import type { PlayerProfile } from '@/lib/types/game';
import { Button, Fade, Label, Title, Sub, Pill, Field } from '@/components/ui';

interface PlayersStepProps {
  players: string[];
  handicaps: number[];
  buyIn: number;
  skinsEnabled: boolean;
  skinsValue: number;
  suggestions: PlayerProfile[];
  onPlayerChange: (index: number, name: string) => void;
  onHandicapChange: (index: number, handicap: number) => void;
  onBuyInChange: (value: number) => void;
  onSkinsEnabledChange: (value: boolean) => void;
  onSkinsValueChange: (value: number) => void;
  onNext: () => void;
  allPlayersFilled: boolean;
}

export function PlayersStep({
  players, handicaps, buyIn, skinsEnabled, skinsValue, suggestions,
  onPlayerChange, onHandicapChange, onBuyInChange, onSkinsEnabledChange, onSkinsValueChange,
  onNext, allPlayersFilled,
}: PlayersStepProps) {
  return (
    <Fade>
      <Title>Players</Title>
      <Sub>Enter all four players and their handicaps.</Sub>

      {players.map((p, i) => (
        <div key={i} className="flex gap-2 mb-2 items-center">
          <Pill>{i + 1}</Pill>
          <input
            type="text"
            placeholder={`Player ${i + 1}`}
            value={p}
            onChange={e => onPlayerChange(i, e.target.value)}
            className="flex-1 bg-wolf-card border border-wolf-border rounded-[10px] py-3 px-3.5
              text-wolf-text text-base font-body outline-none"
          />
          <input
            type="number"
            placeholder="HC"
            value={handicaps[i] || ''}
            onChange={e => onHandicapChange(i, parseInt(e.target.value) || 0)}
            className="w-16 text-center font-mono bg-wolf-card border border-wolf-border rounded-[10px]
              py-3 px-1 text-wolf-text text-base outline-none"
          />
        </div>
      ))}

      {suggestions.length > 0 && players.some(p => !p.trim()) && (
        <div className="mb-4">
          <Label className="mb-1.5">RECENT PLAYERS</Label>
          <div className="flex flex-wrap gap-1.5">
            {suggestions
              .filter(s => !players.map(p => p.toLowerCase().trim()).includes(s.name.toLowerCase()))
              .map(s => (
                <button
                  key={s.name}
                  onClick={() => {
                    const emptyIdx = players.findIndex(p => !p.trim());
                    if (emptyIdx >= 0) onPlayerChange(emptyIdx, s.name);
                  }}
                  className="py-1.5 px-2.5 rounded-lg bg-wolf-card border border-wolf-border
                    text-wolf-text text-[13px] cursor-pointer font-body"
                >
                  {s.name}{' '}
                  <span className="text-wolf-text-muted font-mono text-[11px]">({s.handicap})</span>
                </button>
              ))}
          </div>
        </div>
      )}

      <div className="mt-5">
        <Field label="BUY-IN ($)" value={buyIn} onChange={onBuyInChange} />
      </div>

      <div className="mt-4">
        <button
          onClick={() => onSkinsEnabledChange(!skinsEnabled)}
          className="flex items-center justify-between w-full py-3 px-3.5 bg-wolf-card
            border border-wolf-border rounded-[10px] cursor-pointer"
        >
          <span className="text-wolf-text text-[15px] font-body">Skins Game</span>
          <div className={`w-11 h-6 rounded-full relative transition-colors duration-200
            ${skinsEnabled ? 'bg-wolf-accent' : 'bg-wolf-border'}`}>
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200
              ${skinsEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </div>
        </button>
        {skinsEnabled && (
          <div className="mt-2">
            <Field label="SKINS ($/SKIN)" value={skinsValue} onChange={onSkinsValueChange} />
          </div>
        )}
      </div>

      <Button variant="primary" disabled={!allPlayersFilled} onClick={onNext} className="mt-6">
        Next: Course Setup &rarr;
      </Button>
    </Fade>
  );
}
