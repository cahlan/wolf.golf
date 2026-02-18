'use client';

import type { Course, HoleInfo } from '@/lib/types/game';
import { Button, Fade, Label, Title, Sub } from '@/components/ui';

interface CourseStepProps {
  savedCourses: Course[];
  selectedCourse: Course | null;
  setSelectedCourse: (c: Course | null) => void;
  courseName: string;
  setCourseName: (n: string) => void;
  courseHoles: HoleInfo[];
  setCourseHoles: (h: HoleInfo[]) => void;
  courseMode: 'select' | 'new';
  setCourseMode: (m: 'select' | 'new') => void;
  courseValid: boolean;
  strokeIndexesValid: boolean;
  onBack: () => void;
  onNext: () => void;
}

export function CourseStep({
  savedCourses, selectedCourse, setSelectedCourse,
  courseName, setCourseName, courseHoles, setCourseHoles,
  courseMode, setCourseMode, courseValid, strokeIndexesValid,
  onBack, onNext,
}: CourseStepProps) {
  const strokeIndexes = courseHoles.map(h => h.strokeIndex);

  return (
    <Fade>
      <Title>Course</Title>
      <Sub>Set up the course stroke index so the app knows who pops on each hole.</Sub>

      {/* Saved courses */}
      {savedCourses.length > 0 && courseMode === 'select' && (
        <div className="mb-4">
          <Label>SAVED COURSES</Label>
          {savedCourses.map(c => (
            <button
              key={c.name}
              onClick={() => { setSelectedCourse(c); setCourseMode('select'); }}
              className={`w-full py-3 px-3.5 mb-1.5 rounded-[10px] text-wolf-text text-[15px] font-body
                cursor-pointer text-left flex justify-between items-center border
                ${selectedCourse?.name === c.name
                  ? 'bg-wolf-accent-bg border-wolf-accent/30'
                  : 'bg-wolf-card border-wolf-border'}`}
            >
              <span>{c.name}</span>
              {selectedCourse?.name === c.name && <span className="text-wolf-accent">&#10003;</span>}
            </button>
          ))}
          <button
            onClick={() => { setSelectedCourse(null); setCourseMode('new'); }}
            className="bg-transparent border-none text-wolf-accent text-sm cursor-pointer py-2 px-0 font-body"
          >
            + Add new course
          </button>
        </div>
      )}

      {/* New course entry */}
      {(courseMode === 'new' || savedCourses.length === 0) && (
        <>
          {savedCourses.length > 0 && (
            <button
              onClick={() => setCourseMode('select')}
              className="bg-transparent border-none text-wolf-text-sec text-[13px] cursor-pointer p-0 pb-3 font-body"
            >
              &larr; Back to saved courses
            </button>
          )}
          <input
            type="text"
            placeholder="Course name"
            value={courseName}
            onChange={e => setCourseName(e.target.value)}
            className="w-full mb-4 text-[17px] font-semibold bg-wolf-card border border-wolf-border
              rounded-[10px] py-3 px-3.5 text-wolf-text outline-none"
          />

          <Label>HOLE SETUP — PAR &amp; STROKE INDEX (1=hardest)</Label>
          <div className="bg-wolf-card rounded-xl border border-wolf-border overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[44px_1fr_1fr] py-2 px-3 border-b border-wolf-border
              text-[11px] font-mono text-wolf-text-muted tracking-wider">
              <span>HOLE</span>
              <span className="text-center">PAR</span>
              <span className="text-center">SI</span>
            </div>

            {courseHoles.map((h, i) => (
              <div
                key={i}
                className={`grid grid-cols-[44px_1fr_1fr] py-1.5 px-3 items-center
                  ${i < 17 ? 'border-b border-wolf-border' : ''}
                  ${i === 8 ? 'bg-wolf-hover' : ''}`}
              >
                <span className={`font-mono text-[13px]
                  ${i === 0 || i === 9 ? 'text-wolf-accent font-semibold' : 'text-wolf-text-muted'}`}>
                  {i + 1}
                </span>
                {/* Par */}
                <div className="flex justify-center gap-1">
                  {([3, 4, 5] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => {
                        const n = [...courseHoles];
                        n[i] = { ...n[i], par: p };
                        setCourseHoles(n);
                      }}
                      className={`w-8 h-[30px] rounded-md text-[13px] font-bold font-mono cursor-pointer border
                        ${h.par === p
                          ? 'bg-wolf-accent text-wolf-bg border-wolf-accent'
                          : 'bg-transparent text-wolf-text-sec border-wolf-border'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {/* Stroke Index */}
                <div className="flex justify-center">
                  <input
                    type="number"
                    min={1}
                    max={18}
                    value={h.strokeIndex || ''}
                    placeholder="—"
                    onChange={e => {
                      const n = [...courseHoles];
                      n[i] = { ...n[i], strokeIndex: parseInt(e.target.value) || 0 };
                      setCourseHoles(n);
                    }}
                    className="w-11 text-center py-1.5 px-1 bg-wolf-hover border border-wolf-border
                      rounded-md text-wolf-text text-sm font-mono font-semibold outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          {!strokeIndexesValid && strokeIndexes.some(si => si > 0) && (
            <div className="mt-2 text-xs text-wolf-orange font-mono">
              Stroke indexes must be unique values 1–18
            </div>
          )}
        </>
      )}

      <div className="flex gap-2.5 mt-5">
        <Button onClick={onBack} className="flex-1">
          &larr; Back
        </Button>
        <Button
          variant="primary"
          disabled={!courseValid || (!selectedCourse && !strokeIndexesValid)}
          onClick={onNext}
          className="flex-[2]"
        >
          Next: Wolf Order &rarr;
        </Button>
      </div>
    </Fade>
  );
}
