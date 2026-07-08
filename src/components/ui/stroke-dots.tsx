/**
 * Handicap-stroke indicator: a row of small accent dots, one per stroke a
 * player receives on a hole. Renders nothing when `count` is 0, so callers
 * don't need their own `count > 0` guard.
 *
 * `size="md"` uses the slightly larger 7px dots (score-input preview);
 * the default `"sm"` uses the 6px dots used throughout the result/summary rows.
 */
export function StrokeDots({
  count,
  size = 'sm',
  className = '',
}: {
  count: number;
  size?: 'sm' | 'md';
  className?: string;
}) {
  if (count <= 0) return null;
  const dot = size === 'md' ? 'w-[7px] h-[7px]' : 'w-1.5 h-1.5';
  return (
    <span className={`inline-flex gap-0.5 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={`${dot} rounded-full bg-wolf-accent inline-block`} />
      ))}
    </span>
  );
}
