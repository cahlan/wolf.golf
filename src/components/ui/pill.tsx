import type { ReactNode } from 'react';

export function Pill({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`w-[26px] h-[26px] rounded-full bg-wolf-hover flex items-center justify-center
      text-xs font-mono text-wolf-text-sec shrink-0 ${className}`}>
      {children}
    </div>
  );
}
