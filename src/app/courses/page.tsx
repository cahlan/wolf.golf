'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Course, HoleInfo } from '@/lib/types/game';
import { loadSavedCourses, saveCourse, deleteCourse } from '@/lib/storage/local';
import { fetchCoursesFromSupabase, upsertCourseToSupabase, deleteCourseFromSupabase } from '@/lib/supabase/courses';
import { createCourse } from '@/lib/engine/course';
import { HOLES_PER_ROUND } from '@/lib/engine';
import { BackButton, Button, Fade, Label, Title, Sub } from '@/components/ui';
import { CourseEditor } from '@/components/course/course-editor';

const EMPTY_HOLES: HoleInfo[] = Array.from({ length: HOLES_PER_ROUND }, () => ({ par: 4 as const, strokeIndex: 0 }));

function validateStrokeIndexes(holes: HoleInfo[]): boolean {
  const indexes = holes.map(h => h.strokeIndex);
  return (
    new Set(indexes).size === HOLES_PER_ROUND &&
    indexes.every(si => si >= 1 && si <= HOLES_PER_ROUND)
  );
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Course | 'new' | null>(null);
  const [courseName, setCourseName] = useState('');
  const [courseHoles, setCourseHoles] = useState<HoleInfo[]>(EMPTY_HOLES);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const refreshCourses = useCallback(async () => {
    try {
      const supabaseCourses = await fetchCoursesFromSupabase();
      // Update local cache with Supabase data
      for (const c of supabaseCourses) {
        saveCourse(c);
      }
      setCourses(supabaseCourses);
    } catch {
      // Silent fallback to local
      setCourses(loadSavedCourses());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCourses();
  }, [refreshCourses]);

  const strokeIndexesValid = validateStrokeIndexes(courseHoles);
  const nameValid = courseName.trim() !== '';
  const canSave = nameValid && strokeIndexesValid;

  function startEdit(course: Course) {
    setEditing(course);
    setCourseName(course.name);
    setCourseHoles([...course.holes]);
    setConfirmDelete(null);
  }

  function startNew() {
    setEditing('new');
    setCourseName('');
    setCourseHoles(EMPTY_HOLES.map(h => ({ ...h })));
    setConfirmDelete(null);
  }

  async function handleSave() {
    if (!canSave) return;
    const course = createCourse(courseName.trim(), courseHoles);
    saveCourse(course);
    upsertCourseToSupabase(course).catch(() => {});
    setCourses(prev => {
      const idx = prev.findIndex(c => c.name === course.name);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = course;
        return updated;
      }
      return [...prev, course];
    });
    setEditing(null);
  }

  async function handleDelete(name: string) {
    deleteCourse(name);
    deleteCourseFromSupabase(name).catch(() => {});
    setCourses(prev => prev.filter(c => c.name !== name));
    setConfirmDelete(null);
    if (editing && typeof editing !== 'string' && editing.name === name) {
      setEditing(null);
    }
  }

  const totalPar = (holes: HoleInfo[]) => holes.reduce((s, h) => s + h.par, 0);

  // Loading state
  if (loading) {
    return (
      <div className="px-5 pt-14 pb-10">
        <Fade>
          <BackButton href="/" />
          <Title>Courses</Title>
          <Sub>Loading courses…</Sub>
        </Fade>
      </div>
    );
  }

  // Editor view
  if (editing !== null) {
    const isNew = editing === 'new';
    const originalName = isNew ? null : editing.name;

    return (
      <div className="px-5 pt-14 pb-10">
        <Fade>
          <button
            onClick={() => setEditing(null)}
            className="bg-transparent border-none text-wolf-text-sec text-sm cursor-pointer py-1.5 px-0 mb-3 font-body"
          >
            &larr; Back to courses
          </button>

          <Title>{isNew ? 'New Course' : 'Edit Course'}</Title>
          <Sub>Configure par and stroke index for each hole.</Sub>

          <CourseEditor
            courseName={courseName}
            setCourseName={setCourseName}
            courseHoles={courseHoles}
            setCourseHoles={setCourseHoles}
            strokeIndexesValid={strokeIndexesValid}
          />

          <div className="flex gap-2.5 mt-5">
            <Button onClick={() => setEditing(null)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!canSave}
              onClick={handleSave}
              className="flex-[2]"
            >
              {isNew ? 'Save Course' : 'Save Changes'}
            </Button>
          </div>

          {!isNew && originalName && (
            <div className="mt-6 pt-4 border-t border-wolf-border">
              {confirmDelete === originalName ? (
                <div className="flex gap-2.5">
                  <Button onClick={() => setConfirmDelete(null)} className="flex-1">
                    Cancel
                  </Button>
                  <button
                    onClick={() => handleDelete(originalName)}
                    className="flex-[2] py-[15px] px-5 rounded-xl border-none font-bold text-base font-body
                      cursor-pointer bg-red-600 text-white transition-all duration-150"
                  >
                    Confirm Delete
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(originalName)}
                  className="w-full bg-transparent border-none text-red-400 text-sm cursor-pointer py-2 px-0 font-body"
                >
                  Delete this course
                </button>
              )}
            </div>
          )}
        </Fade>
      </div>
    );
  }

  // List view
  return (
    <div className="px-5 pt-14 pb-10">
      <Fade>
        <BackButton href="/" />

        <Title>Courses</Title>
        <Sub>Manage your saved courses and stroke indexes.</Sub>

        {courses.length === 0 ? (
          <p className="text-wolf-text-sec text-sm text-center py-8">
            No courses yet. Add your first one below.
          </p>
        ) : (
          <div className="mb-4">
            <Label>SAVED COURSES</Label>
            {courses.map(c => (
              <button
                key={c.name}
                onClick={() => startEdit(c)}
                className="w-full py-3 px-3.5 mb-1.5 rounded-[10px] text-wolf-text text-[15px] font-body
                  cursor-pointer text-left flex justify-between items-center border
                  bg-wolf-card border-wolf-border active:bg-wolf-hover"
              >
                <div>
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-wolf-text-muted text-xs ml-2 font-mono">
                    Par {totalPar(c.holes)}
                  </span>
                </div>
                <span className="text-wolf-text-muted text-xs font-mono">
                  {totalPar(c.holes.slice(0, 9))} / {totalPar(c.holes.slice(9))}
                </span>
              </button>
            ))}
          </div>
        )}

        <Button variant="primary" onClick={startNew}>
          + Add Course
        </Button>
      </Fade>
    </div>
  );
}
