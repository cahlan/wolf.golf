'use client';

import { useState, useRef } from 'react';
import type { Course, HoleInfo } from '@/lib/types/game';
import { Button, Fade, Label, Title, Sub } from '@/components/ui';
import { CourseEditor } from '@/components/course/course-editor';
import { UTAH_COURSES } from '@/lib/data/utah-courses';

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

type SearchState = 'idle' | 'loading' | 'error';

export function CourseStep({
  savedCourses, selectedCourse, setSelectedCourse,
  courseName, setCourseName, courseHoles, setCourseHoles,
  courseMode, setCourseMode, courseValid, strokeIndexesValid,
  onBack, onNext, nextLabel = 'Next: Wolf Order',
}: CourseStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [searchError, setSearchError] = useState('');
  const [showUtah, setShowUtah] = useState(false);
  const [imageState, setImageState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Apply a fetched/selected course into the new-course editor fields */
  function applyCourse(course: Course) {
    setCourseName(course.name);
    setCourseHoles([...course.holes]);
    setCourseMode('new');
    setSelectedCourse(null);
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearchState('loading');
    setSearchError('');
    try {
      const res = await fetch(`/api/course-lookup?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.course) {
        setSearchError(data.error ?? 'Course not found. Try a different name or add manually.');
        setSearchState('error');
        return;
      }
      applyCourse(data.course);
      setSearchState('idle');
    } catch {
      setSearchError('Search failed. Check your connection.');
      setSearchState('error');
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageState('loading');
    setImageError('');

    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/course-lookup/image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.course) {
        setImageError(data.error ?? 'Could not read scorecard. Try entering values manually.');
        setImageState('error');
        return;
      }
      applyCourse(data.course);
      setImageState('idle');
    } catch {
      setImageError('Upload failed.');
      setImageState('error');
    } finally {
      // Reset file input so same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

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

          {/* Course Search */}
          <div className="mb-4">
            <Label>SEARCH BY COURSE NAME</Label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. Sky Mountain, Thanksgiving Point…"
                className="flex-1 bg-wolf-card border border-wolf-border rounded-[10px] px-3.5 py-3
                  text-wolf-text text-[15px] font-body placeholder:text-wolf-text-sec/50
                  focus:outline-none focus:border-wolf-accent/50"
              />
              <Button
                variant="primary"
                onClick={handleSearch}
                disabled={searchState === 'loading' || !searchQuery.trim()}
                className="shrink-0 px-4"
              >
                {searchState === 'loading' ? '…' : 'Search'}
              </Button>
            </div>
            {searchState === 'error' && (
              <p className="text-red-400 text-[13px] mt-1.5">{searchError}</p>
            )}
          </div>

          {/* Utah Pre-seeded Courses */}
          <div className="mb-4">
            <button
              onClick={() => setShowUtah(v => !v)}
              className="bg-transparent border-none text-wolf-accent text-sm cursor-pointer py-1 px-0 font-body flex items-center gap-1"
            >
              <span>{showUtah ? '▾' : '▸'}</span>
              <span>Browse Utah courses</span>
            </button>
            {showUtah && (
              <div className="mt-2">
                {UTAH_COURSES.map(c => (
                  <button
                    key={c.name}
                    onClick={() => { applyCourse(c); setShowUtah(false); }}
                    className="w-full py-2.5 px-3.5 mb-1 rounded-[10px] text-wolf-text text-[14px] font-body
                      cursor-pointer text-left bg-wolf-card border border-wolf-border
                      hover:border-wolf-accent/40 transition-colors"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Scorecard Image Upload */}
          <div className="mb-4">
            <Label>UPLOAD SCORECARD PHOTO</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
              id="scorecard-upload"
            />
            <label
              htmlFor="scorecard-upload"
              className={`flex items-center justify-center gap-2 w-full py-3 px-3.5
                rounded-[10px] border border-dashed cursor-pointer transition-colors font-body text-[14px]
                ${imageState === 'loading'
                  ? 'border-wolf-accent/40 text-wolf-text-sec bg-wolf-card/50'
                  : 'border-wolf-border text-wolf-text-sec bg-wolf-card hover:border-wolf-accent/40'}`}
            >
              {imageState === 'loading' ? (
                <>⏳ Reading scorecard…</>
              ) : (
                <>📷 Take a photo or upload scorecard</>
              )}
            </label>
            {imageState === 'error' && (
              <p className="text-red-400 text-[13px] mt-1.5">{imageError}</p>
            )}
            <p className="text-wolf-text-sec text-[12px] mt-1">
              Works best with a clear photo of the full scorecard showing Par and Handicap rows.
            </p>
          </div>

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
