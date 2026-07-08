/**
 * The "VS" separator drawn between two teams/sides on a hole card — a centered
 * label sitting on a horizontal rule. Shared by the wolf and 6x6x6 input and
 * result views.
 */
export function VsDivider() {
  return (
    <div className="text-center py-1 mb-3 relative">
      <div className="absolute top-1/2 left-0 right-0 border-t border-wolf-border" />
      <span className="relative bg-wolf-bg px-3.5 text-xs font-mono text-wolf-text-muted font-semibold tracking-[2px]">
        VS
      </span>
    </div>
  );
}
