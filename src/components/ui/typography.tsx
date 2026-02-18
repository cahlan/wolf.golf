import type { ReactNode } from 'react';

interface TypographyProps {
  children: ReactNode;
  className?: string;
}

export function Title({ children, className = '' }: TypographyProps) {
  return (
    <h2 className={`text-2xl font-extrabold font-display m-0 mb-1.5 tracking-tight ${className}`}>
      {children}
    </h2>
  );
}

export function Sub({ children, className = '' }: TypographyProps) {
  return (
    <p className={`text-wolf-text-sec text-sm mt-0 mb-[18px] leading-relaxed ${className}`}>
      {children}
    </p>
  );
}

export function Label({ children, className = '' }: TypographyProps) {
  return (
    <div className={`text-[11px] font-mono text-wolf-text-muted tracking-[1.5px] mb-1.5 font-medium ${className}`}>
      {children}
    </div>
  );
}
