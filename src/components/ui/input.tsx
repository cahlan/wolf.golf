import { type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`bg-wolf-card border border-wolf-border rounded-[10px] py-3 px-3.5
        text-wolf-text text-base font-body outline-none ${className}`}
      {...props}
    />
  );
}
