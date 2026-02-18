'use client';

import { Label } from './typography';

interface FieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export function Field({ label, value, onChange }: FieldProps) {
  return (
    <div className="flex-1">
      <Label>{label}</Label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseInt(e.target.value) || 0)}
        className="w-full text-xl font-mono text-center bg-wolf-card border border-wolf-border
          rounded-[10px] py-3 px-3.5 text-wolf-text outline-none"
      />
    </div>
  );
}
