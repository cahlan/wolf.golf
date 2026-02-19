'use client';

import { useState } from 'react';
import { Label } from '@/components/ui';

interface AdvancedConfigProps {
  buyIn: number;
  lastPlaceWolf: boolean;
  lastPlaceWolfStartHole: number;
  payoutStructure: 'winner-takes-all' | 'top-two-split' | 'top-three-split';
  skinsCarryover: boolean;
  skinsEnabled: boolean;
  onLastPlaceWolfChange: (value: boolean) => void;
  onLastPlaceWolfStartHoleChange: (value: number) => void;
  onPayoutStructureChange: (value: 'winner-takes-all' | 'top-two-split' | 'top-three-split') => void;
  onSkinsCarryoverChange: (value: boolean) => void;
}

const PAYOUT_OPTIONS: {
  value: 'winner-takes-all' | 'top-two-split' | 'top-three-split';
  label: string;
  getBreakdown: (buyIn: number) => string;
}[] = [
  {
    value: 'winner-takes-all',
    label: 'Winner takes all',
    getBreakdown: (b) => `+$${b * 2} / $0 / -$${b} / -$${b}`,
  },
  {
    value: 'top-two-split',
    label: 'Top 2 split',
    getBreakdown: (b) => `+$${b * 1.5} / +$${b * 0.5} / -$${b} / -$${b}`,
  },
  {
    value: 'top-three-split',
    label: 'Top 3 split',
    getBreakdown: (b) => `+$${b} / +$${b * 0.5} / +$${b * 0.5} / -$${b * 2}`,
  },
];

export function AdvancedConfig({
  buyIn,
  lastPlaceWolf,
  lastPlaceWolfStartHole,
  payoutStructure,
  skinsCarryover,
  skinsEnabled,
  onLastPlaceWolfChange,
  onLastPlaceWolfStartHoleChange,
  onPayoutStructureChange,
  onSkinsCarryoverChange,
}: AdvancedConfigProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-wolf-text-muted text-sm font-body cursor-pointer
          py-2 px-0 bg-transparent border-none"
      >
        <span className={`text-xs transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>
          ▶
        </span>
        Advanced options
      </button>

      {expanded && (
        <div className="mt-3 space-y-4">
          {/* Last place wolf */}
          <div className="bg-wolf-card border border-wolf-border rounded-[10px] p-3.5">
            <button
              onClick={() => onLastPlaceWolfChange(!lastPlaceWolf)}
              className="flex items-center justify-between w-full cursor-pointer bg-transparent border-none p-0"
            >
              <div className="text-left">
                <span className="text-wolf-text text-[15px] font-body block">Last place wolf</span>
                <span className="text-wolf-text-muted text-[12px] font-body">
                  Worst standing picks wolf on closing holes
                </span>
              </div>
              <div className={`w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0 ml-3
                ${lastPlaceWolf ? 'bg-wolf-accent' : 'bg-wolf-border'}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200
                  ${lastPlaceWolf ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
              </div>
            </button>
            {lastPlaceWolf && (
              <div className="mt-3 flex items-center gap-2">
                <Label className="text-[11px] shrink-0">STARTING ON HOLE:</Label>
                <input
                  type="number"
                  min={1}
                  max={18}
                  value={lastPlaceWolfStartHole}
                  onChange={e => {
                    const v = parseInt(e.target.value) || 17;
                    onLastPlaceWolfStartHoleChange(Math.max(1, Math.min(18, v)));
                  }}
                  className="w-16 text-center font-mono bg-wolf-card border border-wolf-border rounded-lg
                    py-2 px-1 text-wolf-text text-base outline-none"
                />
              </div>
            )}
          </div>

          {/* Payout structure */}
          <div className="bg-wolf-card border border-wolf-border rounded-[10px] p-3.5">
            <Label className="mb-2.5">PAYOUT STRUCTURE</Label>
            <div className="flex gap-1.5">
              {PAYOUT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onPayoutStructureChange(opt.value)}
                  className={`flex-1 py-2.5 px-2 rounded-lg text-[13px] font-body cursor-pointer
                    border transition-colors duration-150
                    ${payoutStructure === opt.value
                      ? 'bg-wolf-accent text-wolf-bg border-wolf-accent font-semibold'
                      : 'bg-wolf-hover text-wolf-text border-wolf-border'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[12px] font-mono text-wolf-text-muted text-center">
              {PAYOUT_OPTIONS.find(o => o.value === payoutStructure)?.getBreakdown(buyIn)}
            </p>
          </div>

          {/* Skins carryover */}
          {skinsEnabled && (
            <div className="bg-wolf-card border border-wolf-border rounded-[10px] p-3.5">
              <button
                onClick={() => onSkinsCarryoverChange(!skinsCarryover)}
                className="flex items-center justify-between w-full cursor-pointer bg-transparent border-none p-0"
              >
                <div className="text-left">
                  <span className="text-wolf-text text-[15px] font-body block">Carry over tied holes</span>
                  <span className="text-wolf-text-muted text-[12px] font-body">
                    Off = tied skins are lost
                  </span>
                </div>
                <div className={`w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0 ml-3
                  ${skinsCarryover ? 'bg-wolf-accent' : 'bg-wolf-border'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200
                    ${skinsCarryover ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                </div>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
