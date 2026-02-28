'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/providers/game-provider';
import { createGame, createCourse } from '@/lib/engine';
import { loadSavedCourses, saveCourse, getSuggestedHandicap, getSuggestedPlayers, savePlayerCache } from '@/lib/storage/local';
import { fetchCoursesFromSupabase, upsertCourseToSupabase } from '@/lib/supabase/courses';
import { BackButton } from '@/components/ui';
import { PlayersStep } from '@/components/create/players-step';
import { CourseStep } from '@/components/create/course-step';
import { WolfOrderStep } from '@/components/create/wolf-order-step';
import { TeamRotationStep } from '@/components/create/team-rotation-step';
import { AdvancedConfig } from '@/components/create/advanced-config';
import { generateDefaultSegments } from '@/lib/engine';
import type { Course, HoleInfo, GameType } from '@/lib/types/game';

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
  const [gameType, setGameType] = useState<GameType>('wolf');
  const isThreeTwoOne = gameType === 'three-two-one';
  const playerCount = isThreeTwoOne ? 3 : 4;
  const [teamSegments, setTeamSegments] = useState<[number, number][]>(() => generateDefaultSegments());
  const [suggestions] = useState(() => getSuggestedPlayers());

  // Advanced config state
  const [startingHole, setStartingHole] = useState(1);
  const [lastPlaceWolf, setLastPlaceWolf] = useState(true);
  const [lastPlaceWolfStartHole, setLastPlaceWolfStartHole] = useState(17);
  const [payoutStructure, setPayoutStructure] = useState<'winner-takes-all' | 'top-two-split' | 'top-three-split'>('winner-takes-all');
  const [skinsCarryover, setSkinsCarryover] = useState(true);

  // Course state
  const [savedCourses, setSavedCourses] = useState<Course[]>(() => loadSavedCourses());
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Fetch courses from Supabase on mount
  useEffect(() => {
    fetchCoursesFromSupabase()
      .then(courses => {
        for (const c of courses) saveCourse(c);
        setSavedCourses(courses);
      })
      .catch(() => {
        // Silent fallback — local courses already loaded
      });
  }, []);
  const [courseName, setCourseName] = useState('');
  const [courseHoles, setCourseHoles] = useState<HoleInfo[]>(
    Array.from({ length: 18 }, () => ({ par: 4 as const, strokeIndex: 0 }))
  );
  const [courseMode, setCourseMode] = useState<'select' | 'new'>('select');

  const activePlayers = players.slice(0, playerCount);
  const allPlayersFilled = activePlayers.every(p => p.trim().length > 0);
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
    const trimmedPlayers = activePlayers.map(p => p.trim());
    const hcaps: Record<string, number> = {};
    trimmedPlayers.forEach((name, i) => {
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
    upsertCourseToSupabase(course).catch(() => {});

    const g = createGame({
      gameType,
      players: trimmedPlayers,
      buyIn,
      handicaps: hcaps,
      wolfOrder: gameType === 'wolf' ? wolfOrder : undefined,
      skinsEnabled,
      skinsValue: skinsEnabled ? skinsValue : 0,
      course,
      teamSegments: gameType === 'six' ? teamSegments : undefined,
      startingHole: gameType === 'wolf' ? startingHole : undefined,
      lastPlaceWolf: gameType === 'wolf' ? lastPlaceWolf : undefined,
      lastPlaceWolfStartHole: gameType === 'wolf' ? lastPlaceWolfStartHole : undefined,
      payoutStructure: isThreeTwoOne ? undefined : payoutStructure,
      skinsCarryover,
    });

    setGame(g);
    setIsScorekeeper(true);
    router.push(`/game/${g.id}?keeper=1`);
  }

  function handleCourseNext() {
    if (courseMode === 'new' && !selectedCourse) {
      const course = createCourse(courseName.trim(), courseHoles);
      setSelectedCourse(course);
    }
    if (isThreeTwoOne) {
      handleStart();
    } else {
      setStep(2);
    }
  }

  return (
    <div className="px-5 pt-4 pb-10">
      <BackButton href="/" />

      {/* Step indicators */}
      <div className="flex gap-1 mb-5 justify-center">
        {(isThreeTwoOne
          ? ['Players', 'Course']
          : ['Players', 'Course', gameType === 'wolf' ? 'Wolf Order' : 'Teams']
        ).map((label, i, arr) => (
          <div key={i} className="flex items-center gap-1">
            <div
              className={`w-2 h-2 rounded-full transition-colors duration-200
                ${i <= step ? 'bg-wolf-accent' : 'bg-wolf-border'}`}
            />
            <span className={`text-[11px] font-mono
              ${i <= step ? 'text-wolf-accent' : 'text-wolf-text-muted'}`}>
              {label}
            </span>
            {i < arr.length - 1 && <span className="text-wolf-border mx-1">—</span>}
          </div>
        ))}
      </div>

      {step === 0 && (
        <>
        {/* Game type selector */}
        <div className="flex gap-2 mb-5">
          {([
            { type: 'wolf' as const, label: 'Wolf', emoji: '🐺', desc: 'Pick your partner each hole' },
            { type: 'six' as const, label: '6x6x6', emoji: '🤝', desc: 'Fixed 2v2, rotating every 6' },
            { type: 'three-two-one' as const, label: '3-2-1', emoji: '🏅', desc: '3 players, ranked each hole' },
          ]).map(opt => (
            <button
              key={opt.type}
              onClick={() => {
                setGameType(opt.type);
                if (opt.type === 'three-two-one') {
                  setPlayers(p => [p[0], p[1], p[2], '']);
                  setHandicaps(h => [h[0], h[1], h[2], 0]);
                }
              }}
              className={`flex-1 py-3 px-2.5 rounded-xl border-2 text-center cursor-pointer
                transition-colors duration-150
                ${gameType === opt.type
                  ? 'border-wolf-accent bg-wolf-accent-bg'
                  : 'border-wolf-border bg-wolf-card'}`}
            >
              <div className="text-2xl mb-1">{opt.emoji}</div>
              <div className={`text-sm font-semibold ${gameType === opt.type ? 'text-wolf-accent' : 'text-wolf-text'}`}>
                {opt.label}
              </div>
              <div className="text-[11px] text-wolf-text-muted mt-0.5">
                {opt.desc}
              </div>
            </button>
          ))}
        </div>
        </>
      )}
      {step === 0 && (
        <PlayersStep
          players={activePlayers}
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
          playerCount={playerCount}
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
          nextLabel={isThreeTwoOne ? 'Start Round' : gameType === 'wolf' ? 'Next: Wolf Order' : 'Next: Teams'}
        />
      )}

      {step === 2 && gameType === 'wolf' && (
        <WolfOrderStep
          players={players}
          handicaps={handicaps}
          wolfOrder={wolfOrder}
          setWolfOrder={setWolfOrder}
          selectedCourse={selectedCourse}
          courseHoles={courseHoles}
          onBack={() => setStep(1)}
          onStart={handleStart}
          advancedSlot={
            <AdvancedConfig
              gameType={gameType}
              buyIn={buyIn}
              startingHole={startingHole}
              lastPlaceWolf={lastPlaceWolf}
              lastPlaceWolfStartHole={lastPlaceWolfStartHole}
              payoutStructure={payoutStructure}
              skinsCarryover={skinsCarryover}
              skinsEnabled={skinsEnabled}
              onStartingHoleChange={setStartingHole}
              onLastPlaceWolfChange={setLastPlaceWolf}
              onLastPlaceWolfStartHoleChange={setLastPlaceWolfStartHole}
              onPayoutStructureChange={setPayoutStructure}
              onSkinsCarryoverChange={setSkinsCarryover}
            />
          }
        />
      )}

      {step === 2 && gameType === 'six' && (
        <TeamRotationStep
          players={players}
          handicaps={handicaps}
          teamSegments={teamSegments}
          setTeamSegments={setTeamSegments}
          selectedCourse={selectedCourse}
          courseHoles={courseHoles}
          onBack={() => setStep(1)}
          onStart={handleStart}
          advancedSlot={
            <AdvancedConfig
              gameType={gameType}
              buyIn={buyIn}
              startingHole={startingHole}
              lastPlaceWolf={lastPlaceWolf}
              lastPlaceWolfStartHole={lastPlaceWolfStartHole}
              payoutStructure={payoutStructure}
              skinsCarryover={skinsCarryover}
              skinsEnabled={skinsEnabled}
              onStartingHoleChange={setStartingHole}
              onLastPlaceWolfChange={setLastPlaceWolf}
              onLastPlaceWolfStartHoleChange={setLastPlaceWolfStartHole}
              onPayoutStructureChange={setPayoutStructure}
              onSkinsCarryoverChange={setSkinsCarryover}
            />
          }
        />
      )}
    </div>
  );
}
