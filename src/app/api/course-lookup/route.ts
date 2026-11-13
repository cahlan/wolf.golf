/**
 * Course Lookup API
 *
 * GET /api/course-lookup?q=<course name>
 *   Searches GolfPass for a course by name and returns par + stroke index per hole.
 *
 * Returns: { name, holes: [{par, strokeIndex}] } | { error }
 */

import { NextRequest, NextResponse } from 'next/server';
import type { HoleInfo } from '@/lib/types/game';

const GOLFPASS_SEARCH_URL = 'https://www.golfpass.com/travel-advisor/course-directory/search/';

interface GolfPassCourse {
  id: number;
  name: string;
  city: string;
  state: string;
}

interface ParsedScorecard {
  name: string;
  holes: HoleInfo[];
}

/** Fetch the GolfPass course list page and extract course IDs/names */
async function searchGolfPassCourses(query: string): Promise<GolfPassCourse[]> {
  const url = `${GOLFPASS_SEARCH_URL}?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; wolf-golf-app/1.0)' },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const html = await res.text();

  // Extract course links like /travel-advisor/courses/12787-sky-mountain-golf-course
  const matches = [...html.matchAll(/\/travel-advisor\/courses\/(\d+)-([a-z0-9-]+)/g)];
  const seen = new Set<number>();
  const results: GolfPassCourse[] = [];
  for (const m of matches) {
    const id = parseInt(m[1]);
    if (seen.has(id)) continue;
    seen.add(id);
    const name = m[2].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    results.push({ id, name, city: '', state: '' });
    if (results.length >= 5) break;
  }
  return results;
}

/** Fetch the GolfPass scorecard page and parse par + handicap rows */
async function fetchGolfPassScorecard(courseId: number, slug: string): Promise<ParsedScorecard | null> {
  const url = `https://www.golfpass.com/travel-advisor/courses/${courseId}-${slug}/scorecard-and-layout`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; wolf-golf-app/1.0)' },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const html = await res.text();
  return parseScorecardHtml(html);
}

/**
 * Parse GolfPass scorecard HTML.
 * The page renders two rows of 9 numbers each for Handicap and Par.
 * We extract them from the text in order.
 */
function parseScorecardHtml(html: string): ParsedScorecard | null {
  // Extract course name from <title>
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const rawTitle = titleMatch?.[1] ?? 'Unknown Course';
  const name = rawTitle
    .replace(/\s*-\s*Scorecard.*$/i, '')
    .replace(/\s*\|\s*GolfPass.*$/i, '')
    .trim();

  // Extract all td text content in order — the scorecard is a table
  const cells: string[] = [];
  const cellRe = /<td[^>]*>\s*([^<]+?)\s*<\/td>/gi;
  let m: RegExpExecArray | null;
  while ((m = cellRe.exec(html)) !== null) {
    cells.push(m[1].trim());
  }

  // Find "Handicap" label then read 18 consecutive integers
  const handicaps = extractRowAfterLabel(cells, 'Handicap');
  // Find "Par" label then read 18 consecutive integers
  const pars = extractRowAfterLabel(cells, 'Par');

  if (!handicaps || !pars || handicaps.length !== 18 || pars.length !== 18) {
    return null;
  }

  // Validate pars are 3/4/5
  const validPars = pars.every(p => p === 3 || p === 4 || p === 5);
  // Validate stroke indexes are 1-18 unique
  const siSet = new Set(handicaps);
  const validSI = siSet.size === 18 && handicaps.every(si => si >= 1 && si <= 18);

  if (!validPars || !validSI) return null;

  const holes: HoleInfo[] = pars.map((par, i) => ({
    par: par as 3 | 4 | 5,
    strokeIndex: handicaps[i],
  }));

  return { name, holes };
}

function extractRowAfterLabel(cells: string[], label: string): number[] | null {
  const idx = cells.findIndex(c => c.toLowerCase() === label.toLowerCase());
  if (idx === -1) return null;

  // Collect up to 20 integers after the label, skipping non-numeric cells like "Out" subtotals
  const nums: number[] = [];
  for (let i = idx + 1; i < cells.length && nums.length < 20; i++) {
    const n = parseInt(cells[i]);
    if (!isNaN(n) && n > 0 && n <= 100) {
      nums.push(n);
    } else if (cells[i] === '' || /^\d+$/.test(cells[i]) === false) {
      // Allow skip of non-numeric (like "Out", "In", "Tot" labels)
      if (nums.length > 0 && nums.length !== 9) continue; // keep going
      if (nums.length === 18) break;
    }
  }

  // We want exactly 18 — the scorecard lists front 9 then "Out" subtotal then back 9 then "In"/"Tot"
  // Filter: only keep values that make sense for this row type
  return nums.length >= 18 ? nums.slice(0, 18) : null;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ error: 'Query too short' }, { status: 400 });
  }

  // 1. Search for matching courses
  const courses = await searchGolfPassCourses(q);
  if (courses.length === 0) {
    return NextResponse.json({ error: 'No courses found', results: [] }, { status: 404 });
  }

  // 2. Try to fetch scorecard for the first result
  const first = courses[0];
  const slug = first.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const scorecard = await fetchGolfPassScorecard(first.id, slug);

  if (!scorecard) {
    return NextResponse.json({
      error: 'Could not parse scorecard — try searching by a more specific name',
      candidates: courses.map(c => c.name),
    }, { status: 422 });
  }

  return NextResponse.json({ course: scorecard });
}
