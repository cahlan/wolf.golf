import type { Course, HoleInfo } from '../types/game';

export function createCourse(name: string, holes: HoleInfo[]): Course {
  return { name, holes };
}
