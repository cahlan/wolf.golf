'use client';

import { type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'mini' | 'score';
}

export function Button({ variant = 'secondary', className = '', children, disabled, ...props }: ButtonProps) {
  const base = 'cursor-pointer transition-all duration-150 font-body touch-action-manipulation';

  const variants = {
    primary: `w-full py-[15px] px-5 rounded-xl border-none font-bold text-base font-body
      ${disabled ? 'bg-wolf-text-muted opacity-50 cursor-default' : 'bg-wolf-accent'}
      text-wolf-bg`,
    secondary: `w-full py-[15px] px-5 rounded-xl border border-wolf-border bg-wolf-card
      text-wolf-text font-bold text-base font-body
      ${disabled ? 'opacity-50 cursor-default' : ''}`,
    mini: `w-8 h-8 rounded-md border border-wolf-border bg-wolf-hover
      font-mono text-sm flex items-center justify-center
      ${disabled ? 'text-wolf-text-muted opacity-30 cursor-default' : 'text-wolf-text'}`,
    score: `w-10 h-10 rounded-lg border border-wolf-border bg-wolf-hover
      text-wolf-text text-xl font-bold font-mono flex items-center justify-center`,
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
