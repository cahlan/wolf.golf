'use client';

import { useState, type ReactNode } from 'react';
import type { Course, HoleInfo } from '@/lib/types/game';
import { getAllStrokesForHole } from '@/lib/engine';
import { createCourse } from '@/lib/engine';
import { getTeamsForHole } from '@/lib/engine/six';
import { Button, Fade, Label, Title, Sub } from '@/components/ui';

interface TeamRotationStepProps {
  players: string[];
  handicaps: number[];
  teamSegments: [number, number][];
  setTeamSegments: (segments: [number, number][]) => void;
  selectedCourse: Course | null;
  courseHoles: HoleInfo[];
  onBack: () => void;
  onStart: () => void;
  advancedSlot?: ReactNode;
}

const SEGMENT_LABELS = ['Holes 1–6', 'Holes 7–12', 'Holes 13–18'];

export function TeamRotationStep({
  players, handicaps, teamSegments, setTeamSegments,
  selectedCourse, courseHoles, onBack, onStart, advancedSlot,
}: TeamRotationStepProps) {
  const [shuffleKey, setShuffleKey] = useState(0);

  function shuffle() {
    const shuffled = [...teamSegments];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setTeamSegments(shuffled);
    setShuffleKey(k => k + 1);
  }

  function swapInSegment(segIdx: number) {
    const updated = [...teamSegments] as [number, number][];
    const pair = updated[segIdx];
    const allIndices = [0, 1, 2, 3];
    const otherIndices = allIndices.filter(i => i !== pair[0] && i !== pair[1]);
    // Swap: put pair[0] with otherIndices[0], pair[1] with otherIndices[1]
    updated[segIdx] = [pair[0], otherIndices[0]];
    setTeamSegments(updated);
  }

  const pNames = players.map((p, i) => p.trim() || `P${i + 1}`);

  return (
    <Fade>
      <Title>Team Rotation</Title>
      <Sub>Fixed 2v2 teams rotate every 6 holes. Tap a segment to swap teams.</Sub>

      <div className="flex justify-end mb-2.5">
        <button
          onClick={shuffle}
          className="bg-wolf-card border border-wolf-border rounded-lg py-2 px-3.5 cursor-pointer
            text-wolf-text text-sm font-body flex items-center gap-1.5"
        >
          🎲 Randomize
        </button>
      </div>

      {teamSegments.map((pair, segIdx) => {
        const allIndices = [0, 1, 2, 3];
        const otherIndices = allIndices.filter(i => i !== pair[0] && i !== pair[1]);
        const teamA = [pNames[pair[0]], pNames[pair[1]]];
        const teamB = [pNames[otherIndices[0]], pNames[otherIndices[1]]];

        return (
          <button
            key={`${shuffleKey}-${segIdx}`}
            style={shuffleKey > 0 ? { animation: `shuffleIn 250ms ease-out ${segIdx * 50}ms both` } : undefined}
            onClick={() => swapInSegment(segIdx)}
            className="w-full mb-2.5 bg-wolf-card border border-wolf-border rounded-[10px]
              p-3.5 cursor-pointer text-left"
          >
            <div className="text-[11px] font-mono text-wolf-accent tracking-[1.5px] mb-2 font-semibold">
              {SEGMENT_LABELS[segIdx]}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 text-center">
                <div className="text-[15px] font-semibold text-wolf-text">
                  {teamA[0]} & {teamA[1]}
                </div>
              </div>
              <span className="text-xs font-mono text-wolf-text-muted font-semibold tracking-[2px]">
                VS
              </span>
              <div className="flex-1 text-center">
                <div className="text-[15px] font-semibold text-wolf-text">
                  {teamB[0]} & {teamB[1]}
                </div>
              </div>
            </div>
          </button>
        );
      })}

      {/* Stroke preview */}
      <div className="mt-5 p-3.5 bg-wolf-accent-bg rounded-xl border border-wolf-accent/10">
        <Label className="text-wolf-accent mb-2">STROKE PREVIEW — FIRST 4 HOLES</Label>
        {[1, 2, 3, 4].map(holeNum => {
          const course = selectedCourse || createCourse('', courseHoles);
          const hcaps: Record<string, number> = {};
          players.forEach((p, i) => (hcaps[p.trim() || `P${i + 1}`] = handicaps[i]));
          const tempGame = {
            players: pNames,
            handicaps: hcaps,
            course,
            teamSegments,
            gameType: 'six' as const,
          };
          const strokes = getAllStrokesForHole(tempGame as Parameters<typeof getAllStrokesForHole>[0], holeNum);
          const hi = course.holes[holeNum - 1];
          const { teamA, teamB } = getTeamsForHole(tempGame as Parameters<typeof getTeamsForHole>[0], holeNum);

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
                {[...teamA, ...teamB].map(p => {
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

      {advancedSlot}

      <div className="flex gap-2.5 mt-6">
        <Button onClick={onBack} className="flex-1">
          &larr; Back
        </Button>
        <Button variant="primary" onClick={onStart} className="flex-[2]">
          Start Round 🤝
        </Button>
      </div>
    </Fade>
  );
}
