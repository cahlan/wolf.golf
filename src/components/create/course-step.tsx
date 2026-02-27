'use client';

import type { Course, HoleInfo } from '@/lib/types/game';
import { Button, Fade, Label, Title, Sub } from '@/components/ui';
import { CourseEditor } from '@/components/course/course-editor';

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
  nextLabel?: string;
}

export function CourseStep({
  savedCourses, selectedCourse, setSelectedCourse,
  courseName, setCourseName, courseHoles, setCourseHoles,
  courseMode, setCourseMode, courseValid, strokeIndexesValid,
  onBack, onNext, nextLabel = 'Next: Wolf Order',
}: CourseStepProps) {
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
          <CourseEditor
            courseName={courseName}
            setCourseName={setCourseName}
            courseHoles={courseHoles}
            setCourseHoles={setCourseHoles}
            strokeIndexesValid={strokeIndexesValid}
          />
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
          {nextLabel} &rarr;
        </Button>
      </div>
    </Fade>
  );
}
