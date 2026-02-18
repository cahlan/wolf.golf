'use client';

import type { Course, HoleInfo } from '@/lib/types/game';
import { getAllStrokesForHole } from '@/lib/engine';
import { createCourse } from '@/lib/engine';
import { Button, Fade, Label, Title, Sub } from '@/components/ui';

interface WolfOrderStepProps {
  players: string[];
  handicaps: number[];
  wolfOrder: number[];
  setWolfOrder: (order: number[]) => void;
  selectedCourse: Course | null;
  courseHoles: HoleInfo[];
  onBack: () => void;
  onStart: () => void;
}

export function WolfOrderStep({
  players, handicaps, wolfOrder, setWolfOrder,
  selectedCourse, courseHoles, onBack, onStart,
}: WolfOrderStepProps) {
  function moveOrder(from: number, to: number) {
    const n = [...wolfOrder];
    const [item] = n.splice(from, 1);
    n.splice(to, 0, item);
    setWolfOrder(n);
  }

  function shuffle() {
    const shuffled = [...wolfOrder];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setWolfOrder(shuffled);
  }

  return (
    <Fade>
      <Title>Wolf Order</Title>
      <Sub>Set the wolf rotation for holes 1–16. Last place takes over for 17 &amp; 18.</Sub>

      <div className="flex justify-end mb-2.5">
        <button
          onClick={shuffle}
          className="bg-wolf-card border border-wolf-border rounded-lg py-2 px-3.5 cursor-pointer
            text-wolf-text text-sm font-body flex items-center gap-1.5"
        >
          🎲 Randomize
        </button>
      </div>

      {wolfOrder.map((pIdx, pos) => (
        <div
          key={pIdx}
          className="flex items-center gap-2.5 mb-2 bg-wolf-card border border-wolf-border
            rounded-[10px] py-3 px-3.5"
        >
          <span className="font-mono text-sm text-wolf-accent w-6 font-semibold">
            {pos + 1}.
          </span>
          <span className="flex-1 text-base font-medium">
            {players[pIdx] || `Player ${pIdx + 1}`}
          </span>
          <Button
            variant="mini"
            disabled={pos === 0}
            onClick={() => moveOrder(pos, pos - 1)}
          >
            &uarr;
          </Button>
          <Button
            variant="mini"
            disabled={pos === 3}
            onClick={() => moveOrder(pos, pos + 1)}
          >
            &darr;
          </Button>
        </div>
      ))}

      {/* Preview: who pops on first few holes */}
      <div className="mt-5 p-3.5 bg-wolf-accent-bg rounded-xl border border-wolf-accent/10">
        <Label className="text-wolf-accent mb-2">STROKE PREVIEW — FIRST 4 HOLES</Label>
        {[1, 2, 3, 4].map(holeNum => {
          const course = selectedCourse || createCourse('', courseHoles);
          const hcaps: Record<string, number> = {};
          players.forEach((p, i) => (hcaps[p.trim() || `P${i + 1}`] = handicaps[i]));
          const pNames = players.map((p, i) => p.trim() || `P${i + 1}`);
          const tempGame = { players: pNames, handicaps: hcaps, course } as Parameters<typeof getAllStrokesForHole>[0];
          const strokes = getAllStrokesForHole(tempGame, holeNum);
          const hi = course.holes[holeNum - 1];

          return (
            <div
              key={holeNum}
              className={`flex items-center gap-2 py-1.5 text-[13px]
                ${holeNum > 1 ? 'border-t border-wolf-accent/10' : ''}`}
            >
              <span className="font-mono text-wolf-text-muted w-[52px]">
                #{holeNum} P{hi?.par}
              </span>
              <span className="font-mono text-wolf-text-muted w-9 text-[11px]">
                SI:{hi?.strokeIndex}
              </span>
              <div className="flex-1 flex gap-2">
                {pNames.map(p => {
                  const s = strokes[p];
                  return (
                    <span
                      key={p}
                      className={`text-xs ${s > 0 ? 'text-wolf-accent font-semibold' : 'text-wolf-text-muted'}`}
                    >
                      {p.slice(0, 5)}{s > 0 && ` (${s})`}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2.5 mt-6">
        <Button onClick={onBack} className="flex-1">
          &larr; Back
        </Button>
        <Button variant="primary" onClick={onStart} className="flex-[2]">
          Start Round 🐺
        </Button>
      </div>
    </Fade>
  );
}
