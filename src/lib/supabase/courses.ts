// ============================================================================
// Supabase Course Storage
// ============================================================================
//
// Run in Supabase SQL editor:
// create table courses (
//   name text primary key,
//   holes jsonb not null,
//   updated_at timestamptz default now()
// );
// alter table courses enable row level security;
// create policy "Public read" on courses for select using (true);
// create policy "Public write" on courses for insert with check (true);
// create policy "Public update" on courses for update using (true);
// create policy "Public delete" on courses for delete using (true);
// ============================================================================

import { supabase } from '@/lib/supabase/client';
import type { Course, HoleInfo } from '@/lib/types/game';

const DEFAULT_RCC: Course = {
  name: 'RCC',
  holes: [
    { par: 4, strokeIndex: 15 },
    { par: 4, strokeIndex: 13 },
    { par: 3, strokeIndex: 17 },
    { par: 4, strokeIndex: 1 },
    { par: 5, strokeIndex: 5 },
    { par: 4, strokeIndex: 9 },
    { par: 4, strokeIndex: 7 },
    { par: 3, strokeIndex: 3 },
    { par: 5, strokeIndex: 11 },
    { par: 4, strokeIndex: 16 },
    { par: 3, strokeIndex: 18 },
    { par: 4, strokeIndex: 2 },
    { par: 5, strokeIndex: 10 },
    { par: 4, strokeIndex: 8 },
    { par: 4, strokeIndex: 6 },
    { par: 4, strokeIndex: 12 },
    { par: 3, strokeIndex: 14 },
    { par: 4, strokeIndex: 4 },
  ],
};

interface CourseRow {
  name: string;
  holes: HoleInfo[];
}

/** Fetch all courses from Supabase. Seeds RCC if not present. */
export async function fetchCoursesFromSupabase(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('name, holes')
    .returns<CourseRow[]>();

  if (error) throw error;

  const courses: Course[] = (data ?? []).map(row => ({
    name: row.name,
    holes: row.holes,
  }));

  // Seed RCC if not present
  if (!courses.some(c => c.name === 'RCC')) {
    await upsertCourseToSupabase(DEFAULT_RCC);
    courses.push(DEFAULT_RCC);
  }

  return courses;
}

/** Upsert a course (insert or update by name). */
export async function upsertCourseToSupabase(course: Course): Promise<void> {
  const { error } = await supabase
    .from('courses')
    .upsert(
      { name: course.name, holes: course.holes, updated_at: new Date().toISOString() },
      { onConflict: 'name' },
    );

  if (error) throw error;
}

/** Delete a course by name. */
export async function deleteCourseFromSupabase(name: string): Promise<void> {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('name', name);

  if (error) throw error;
}
