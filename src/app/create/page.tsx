'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/providers/game-provider';
import { createGame, createCourse } from '@/lib/engine';
import { loadSavedCourses, saveCourse, getSuggestedHandicap, getSuggestedPlayers, savePlayerCache } from '@/lib/storage/local';
import { BackButton } from '@/components/ui';
import { PlayersStep } from '@/components/create/players-step';
import { CourseStep } from '@/components/create/course-step';
import { WolfOrderStep } from '@/components/create/wolf-order-step';
import type { Course, HoleInfo } from '@/lib/types/game';

export default function CreateGamePage() {
  const router = useRouter();
  const { setGame, setIsScorekeeper } = useGame();

  const [step, setStep] = useState(0);
  const [players, setPlayers] = useState(['', '', '', '']);
  const [handicaps, setHandicaps] = useState([0, 0, 0, 0]);
  const [buyIn, setBuyIn] = useState(50);
  const [skinsEnabled, setSkinsEnabled] = useState(true);
  const [skinsValue, setSkinsValue] = useState(5);
  const [wolfOrder, setWolfOrder] = useState([0, 1, 2, 3]);
  const [suggestions] = useState(() => getSuggestedPlayers());

  // Course state
  const [savedCourses] = useState(() => loadSavedCourses());
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseName, setCourseName] = useState('');
  const [courseHoles, setCourseHoles] = useState<HoleInfo[]>(
    Array.from({ length: 18 }, () => ({ par: 4 as const, strokeIndex: 0 }))
  );
  const [courseMode, setCourseMode] = useState<'select' | 'new'>('select');

  const allPlayersFilled = players.every(p => p.trim().length > 0);
  const courseValid = !!selectedCourse || (
    courseName.trim() !== '' && courseHoles.every(h => h.strokeIndex >= 1 && h.strokeIndex <= 18)
  );

  const strokeIndexes = courseHoles.map(h => h.strokeIndex);
  const strokeIndexesValid = courseMode === 'select' || (
    new Set(strokeIndexes).size === 18 &&
    strokeIndexes.every(si => si >= 1 && si <= 18)
  );

  function handlePlayerNameChange(index: number, name: string) {
    const np = [...players];
    np[index] = name;
    setPlayers(np);

    const suggested = getSuggestedHandicap(name);
    if (suggested !== null) {
      const nh = [...handicaps];
      nh[index] = suggested;
      setHandicaps(nh);
    }
  }

  function handleHandicapChange(index: number, handicap: number) {
    const nh = [...handicaps];
    nh[index] = handicap;
    setHandicaps(nh);
  }

  function handleStart() {
    const hcaps: Record<string, number> = {};
    players.forEach((p, i) => {
      const name = p.trim();
      hcaps[name] = handicaps[i];
      savePlayerCache(name, handicaps[i]);
    });

    let course: Course;
    if (selectedCourse) {
      course = selectedCourse;
    } else {
      course = createCourse(courseName.trim(), courseHoles);
    }
    saveCourse(course);

    const g = createGame({
      players: players.map(p => p.trim()),
      buyIn,
      handicaps: hcaps,
      wolfOrder,
      skinsEnabled,
      skinsValue: skinsEnabled ? skinsValue : 0,
      course,
    });

    setGame(g);
    setIsScorekeeper(true);
    router.push(`/game/${g.id}`);
  }

  function handleCourseNext() {
    if (courseMode === 'new' && !selectedCourse) {
      const course = createCourse(courseName.trim(), courseHoles);
      setSelectedCourse(course);
    }
    setStep(2);
  }

  return (
    <div className="px-5 pt-4 pb-10">
      <BackButton href="/" />

      {/* Step indicators */}
      <div className="flex gap-1 mb-5 justify-center">
        {['Players', 'Course', 'Wolf Order'].map((label, i) => (
          <div key={i} className="flex items-center gap-1">
            <div
              className={`w-2 h-2 rounded-full transition-colors duration-200
                ${i <= step ? 'bg-wolf-accent' : 'bg-wolf-border'}`}
            />
            <span className={`text-[11px] font-mono
              ${i <= step ? 'text-wolf-accent' : 'text-wolf-text-muted'}`}>
              {label}
            </span>
            {i < 2 && <span className="text-wolf-border mx-1">—</span>}
          </div>
        ))}
      </div>

      {step === 0 && (
        <PlayersStep
          players={players}
          handicaps={handicaps}
          buyIn={buyIn}
          skinsEnabled={skinsEnabled}
          skinsValue={skinsValue}
          suggestions={suggestions}
          onPlayerChange={handlePlayerNameChange}
          onHandicapChange={handleHandicapChange}
          onBuyInChange={setBuyIn}
          onSkinsEnabledChange={setSkinsEnabled}
          onSkinsValueChange={setSkinsValue}
          onNext={() => setStep(1)}
          allPlayersFilled={allPlayersFilled}
        />
      )}

      {step === 1 && (
        <CourseStep
          savedCourses={savedCourses}
          selectedCourse={selectedCourse}
          setSelectedCourse={setSelectedCourse}
          courseName={courseName}
          setCourseName={setCourseName}
          courseHoles={courseHoles}
          setCourseHoles={setCourseHoles}
          courseMode={courseMode}
          setCourseMode={setCourseMode}
          courseValid={courseValid}
          strokeIndexesValid={strokeIndexesValid}
          onBack={() => setStep(0)}
          onNext={handleCourseNext}
        />
      )}

      {step === 2 && (
        <WolfOrderStep
          players={players}
          handicaps={handicaps}
          wolfOrder={wolfOrder}
          setWolfOrder={setWolfOrder}
          selectedCourse={selectedCourse}
          courseHoles={courseHoles}
          onBack={() => setStep(1)}
          onStart={handleStart}
        />
      )}
    </div>
  );
}
