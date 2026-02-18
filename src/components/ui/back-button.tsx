'use client';

import { useRouter } from 'next/navigation';

interface BackButtonProps {
  href?: string;
  onClick?: () => void;
  inline?: boolean;
}

export function BackButton({ href, onClick, inline }: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`bg-transparent border-none text-wolf-text-sec text-sm cursor-pointer font-body
        ${inline ? 'p-0 mb-0' : 'py-1.5 px-0 mb-3'}`}
    >
      &larr; Back
    </button>
  );
}
