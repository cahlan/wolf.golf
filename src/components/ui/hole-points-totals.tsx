/**
 * The per-player points row shown at the bottom of a wolf/6x6x6 hole card:
 * each player's abbreviated name over their points for the hole (`+N`, or `—`
 * when they scored nothing). Used for both the live preview (input) and the
 * committed result.
 */
export function HolePointsTotals({
  players,
  points,
}: {
  players: string[];
  points: Record<string, number>;
}) {
  return (
    <div className="flex justify-around mt-2.5">
      {players.map(p => {
        const pts = points[p];
        return (
          <div key={p} className="text-center">
            <div className="text-[11px] text-wolf-text-muted">{p.slice(0, 5)}</div>
            <div className={`font-mono font-extrabold text-lg
              ${pts > 0 ? 'text-wolf-accent' : 'text-wolf-text-muted'}`}>
              {pts > 0 ? `+${pts}` : '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
