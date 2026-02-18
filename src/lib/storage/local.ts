import type { Game, Course, PlayerProfile } from '../types/game';

// ============================================================================
// SAVED COURSES
// ============================================================================

const DEFAULT_COURSES: Course[] = [
  {
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
  },
];

export function loadSavedCourses(): Course[] {
  try {
    const userCourses: Course[] = JSON.parse(localStorage.getItem('wolf_courses') || '[]');
    const userNames = new Set(userCourses.map(c => c.name));
    const defaults = DEFAULT_COURSES.filter(c => !userNames.has(c.name));
    return [...defaults, ...userCourses];
  } catch { return [...DEFAULT_COURSES]; }
}

export function saveCourse(course: Course): void {
  const courses = loadSavedCourses();
  const idx = courses.findIndex(c => c.name === course.name);
  if (idx >= 0) courses[idx] = course;
  else courses.push(course);
  localStorage.setItem('wolf_courses', JSON.stringify(courses));
}

// ============================================================================
// GAME PERSISTENCE
// ============================================================================

export function saveActiveGame(game: Game): void {
  try {
    localStorage.setItem('wolf_active_game', JSON.stringify(game));
  } catch (e) { console.error('Failed to save game', e); }
}

export function loadActiveGame(): Game | null {
  try {
    const data = localStorage.getItem('wolf_active_game');
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

export function clearActiveGame(): void {
  localStorage.removeItem('wolf_active_game');
}

export function saveWeekendGames(games: Game[]): void {
  try {
    localStorage.setItem('wolf_weekend', JSON.stringify(games));
  } catch (e) { console.error('Failed to save weekend', e); }
}

export function loadWeekendGames(): Game[] {
  try {
    const data = localStorage.getItem('wolf_weekend');
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

// ============================================================================
// PLAYER HANDICAP CACHE
// ============================================================================

export function loadPlayerCache(): Record<string, PlayerProfile> {
  try {
    return JSON.parse(localStorage.getItem('wolf_players') || '{}');
  } catch { return {}; }
}

export function savePlayerCache(name: string, handicap: number): void {
  const cache = loadPlayerCache();
  cache[name.toLowerCase().trim()] = { name: name.trim(), handicap };
  localStorage.setItem('wolf_players', JSON.stringify(cache));
}

export function getSuggestedHandicap(name: string): number | null {
  const cache = loadPlayerCache();
  const entry = cache[name.toLowerCase().trim()];
  return entry ? entry.handicap : null;
}

export function getSuggestedPlayers(): PlayerProfile[] {
  const cache = loadPlayerCache();
  return Object.values(cache);
}
