import type { ReactNode } from 'react';

export function Fade({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`animate-[fadeUp_0.2s_ease-out] ${className}`}>
      {children}
    </div>
  );
}
