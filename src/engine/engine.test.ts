/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { alternativesFor, day, exercise, makeCustomExercise, painAreasFor, setCustomExercises } from './exercises';
import { planNext, nextDayId, ROTATION, rotationFor, stallCheck, stalledLifts } from './plan';
import { PROGRAMS, suggestPrograms, withGoalReps } from './programs';
import { estimate1RM, weightForReps } from './oneRm';
import { suggest } from './progression';
import { weeklyRecap } from './recap';
import { rollingVolume, targetFor, weeklyTarget } from './volume';
import { estimateMinutes, formatClock, restSeconds } from './rest';
import { HealthData, proteinTarget, shortNightStreak, weightTrend } from './health';
import { backupFileName, makeBackup, readBackup } from './backup';
import { Session, Settings } from './types';
import { cycleFor, trainingMaxFrom1RM } from './wave';
import { warmUpSets } from './warmup';

const DAY = 24 * 60 * 60 * 1000;
const start = new Date('2026-11-01T17:00:00Z');
const at = (d: number) => new Date(start.getTime() + d * DAY);

const settings: Settings = {
  mode: 'cut',
  unit: 'lb',
  blockStart: start.toISOString(),
  deloadStart: null,
  lastDeloadEnd: null,
  swaps: {},
  customExercises: [],
  nextDayOverride: null,
};

// Logs a session exactly as planned, at a set weight and reps
function doSession(sessions: Session[], when: Date, reps = 10, pain = 0): Session[] {
  const plan = planNext(sessions, settings, when);
  const s: Session = {
    id: `s${sessions.length}`,
    dayId: plan.day.id,
    startedAt: new Date(when.getTime() - 3600_000).toISOString(),
    finishedAt: when.toISOString(),
    exercises: plan.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      sets: Array.from({ length: e.sets }, () => ({ weight: 100, reps, rir: 2, done: true })),
      pain,
      painArea: pain ? 'Shoulder' : null,
    })),
  };
  return [...sessions, s];
}

function catchUp(sessions: Session[], when: Date) {
  return planNext(sessions, settings, when).exercises.reduce((t, e) => t + e.catchUpSets, 0);
}

test('rotation goes in order and wraps, with no calendar', () => {
  let sessions: Session[] = [];
  const seen: string[] = [];
  for (let i = 0; i < 7; i++) {
    seen.push(nextDayId(sessions, settings));
    sessions = doSession(sessions, at(i));
  }
  assert.deepEqual(seen, [...ROTATION, ROTATION[0]]);
});

test('targets ramp across the block and cut is lower than build', () => {
  assert.equal(weeklyTarget('chest', 'cut', 0, false), 10);
  assert.equal(weeklyTarget('chest', 'cut', 4, false), 14);
  assert.equal(weeklyTarget('chest', 'cut', 9, false), 14);
  assert.ok(weeklyTarget('back', 'build', 2, false) > weeklyTarget('back', 'cut', 2, false));
  assert.equal(weeklyTarget('chest', 'cut', 3, true), 5);
});

test('arm targets start at 10 in a cut', () => {
  assert.equal(weeklyTarget('triceps', 'cut', 0, false), 10);
  assert.equal(weeklyTarget('biceps', 'build', 4, false), 18);
});

test('every muscle gets at least 3 direct sets, even with helper credit', () => {
  for (const id of ['push-a', 'pull-a', 'push-b', 'pull-b']) {
    const plan = planNext([], { ...settings, nextDayOverride: id }, at(0));
    const direct = new Map<string, number>();
    for (const e of plan.exercises) {
      const m = exercise(e.exerciseId).primary;
      direct.set(m, (direct.get(m) ?? 0) + e.sets);
    }
    for (const [m, n] of direct) if (m !== 'frontDelts') assert.ok(n >= 3, `${id} ${m} ${n}`); // no target of its own
  }
});

test('6 days a week reaches every weekly target by the end of the ramp', () => {
  let sessions: Session[] = [];
  const short: string[] = [];
  const counts: Record<string, number[]> = {};
  for (let d = 0; d < 42; d++) {
    if (d >= 35) {
      const v = rollingVolume(sessions, at(d));
      for (const m of ['chest', 'back', 'sideDelts', 'triceps', 'biceps', 'quads', 'hamstrings', 'calves'] as const)
        (counts[m] ??= []).push(v[m] ?? 0);
    }
    if (d % 7 !== 6) sessions = doSession(sessions, at(d));
  }
  for (const [m, vs] of Object.entries(counts)) {
    const avg = vs.reduce((a, b) => a + b, 0) / vs.length;
    if (avg < weeklyTarget(m as never, 'cut', 5, false) - 1) short.push(`${m} ${avg.toFixed(1)}`);
  }
  assert.deepEqual(short, []);
});

test('half credit for secondary muscles', () => {
  const s: Session = {
    id: 'x',
    dayId: 'push-a',
    startedAt: at(0).toISOString(),
    finishedAt: at(0).toISOString(),
    exercises: [{ exerciseId: 'pl-flat-press', sets: [1, 2, 3].map(() => ({ weight: 100, reps: 8, rir: 2, done: true })) }],
  };
  const v = rollingVolume([s], at(1));
  assert.equal(v.chest, 3);
  assert.equal(v.triceps, 1.5);
  assert.equal(rollingVolume([s], at(8)).chest, undefined);
});

test('training 5-6 days a week needs no catch-up', () => {
  let sessions: Session[] = [];
  // Two weeks, resting every 6th day
  let d = 0;
  for (let i = 0; i < 12; i++) {
    if (i % 5 === 0 && i > 0) d++;
    if (d >= 8) assert.equal(catchUp(sessions, at(d)), 0, `day ${d}`);
    sessions = doSession(sessions, at(d));
    d++;
  }
});

test('sick days: first session back is normal, then catch-up, capped per muscle', () => {
  let sessions: Session[] = [];
  for (let d = 0; d < 10; d++) sessions = doSession(sessions, at(d));
  // Sick days 10-14
  const back = planNext(sessions, settings, at(15));
  assert.ok(back.comeback);
  assert.equal(back.exercises.reduce((t, e) => t + e.catchUpSets, 0), 0);
  sessions = doSession(sessions, at(15));
  sessions = doSession(sessions, at(16));
  const next = planNext(sessions, settings, at(17));
  assert.ok(!next.comeback);
  const caught = next.exercises.reduce((t, e) => t + e.catchUpSets, 0);
  assert.ok(caught > 0, 'expected catch-up sets');
  // Never more than 3 catch-up sets for one muscle
  const byMuscle = new Map<string, number>();
  for (const e of next.exercises) {
    const m = exercise(e.exerciseId).primary;
    byMuscle.set(m, (byMuscle.get(m) ?? 0) + e.catchUpSets);
  }
  for (const n of byMuscle.values()) assert.ok(n <= 3);
});

test('first week has no catch-up', () => {
  let sessions: Session[] = [];
  for (let d = 0; d < 3; d++) sessions = doSession(sessions, at(d * 2));
  assert.equal(catchUp(sessions, at(6)), 0);
});

test('double progression adds weight only after the top of the range', () => {
  let sessions = doSession([], at(0), 10); // pl-incline-press range 6-10
  let s = suggest('pl-incline-press', sessions, { comeback: false, deload: false });
  assert.equal(s.weight, 110);
  assert.equal(s.targetReps, 6);
  sessions = doSession([], at(0), 8);
  s = suggest('pl-incline-press', sessions, { comeback: false, deload: false });
  assert.equal(s.weight, 100);
  assert.equal(s.targetReps, 9);
});

test('pain holds or lowers the weight', () => {
  const hurt = doSession([], at(0), 10, 6);
  const s = suggest('pl-incline-press', hurt, { comeback: false, deload: false });
  assert.equal(s.weight, 90);
  assert.ok(s.swapSuggested);
  const mild = doSession([], at(0), 10, 3);
  assert.equal(suggest('pl-incline-press', mild, { comeback: false, deload: false }).weight, 100);
});

test('assisted pull-up progresses by using less assistance', () => {
  const sessions = doSession(doSession([], at(0)), at(1)); // push-a, pull-a
  const pull = sessions[1];
  pull.exercises[0].sets.forEach((x) => (x.reps = 12));
  const s = suggest('assisted-pullup', sessions, { comeback: false, deload: false });
  assert.equal(s.weight, 90);
  assert.equal(suggest('assisted-pullup', sessions, { comeback: true, deload: false }).weight, 110);
});

test('deload roughly halves the sets', () => {
  let sessions: Session[] = [];
  for (let d = 0; d < 8; d++) sessions = doSession(sessions, at(d));
  const normal = planNext(sessions, settings, at(8));
  const deload = planNext(sessions, { ...settings, deloadStart: at(8).toISOString() }, at(8));
  const sum = (p: typeof normal) => p.exercises.reduce((t, e) => t + e.sets, 0);
  assert.ok(sum(deload) < sum(normal) * 0.75, `${sum(deload)} vs ${sum(normal)}`);
});

test('a replacement applies on every day and keeps the muscle', () => {
  const swapped = { ...settings, swaps: { 'pl-incline-press': 'db-incline-press' } };
  for (const id of ['push-a', 'push-b']) {
    const plan = planNext([], { ...swapped, nextDayOverride: id }, at(0));
    const ids = plan.exercises.map((e) => e.exerciseId);
    assert.ok(ids.includes('db-incline-press'));
    assert.ok(!ids.includes('pl-incline-press'));
  }
});

test('your own exercise can replace one and counts toward volume', () => {
  const mine = makeCustomExercise({ name: 'Iso-lateral row', primary: 'back', repMin: 8, repMax: 12, kind: 'compound', increment: 10 });
  setCustomExercises([mine]);
  const s2 = { ...settings, customExercises: [mine], swaps: { 'cable-row': mine.id }, nextDayOverride: 'pull-a' };
  const plan = planNext([], s2, at(0));
  const row = plan.exercises.find((e) => e.exerciseId === mine.id);
  assert.ok(row);
  assert.ok(alternativesFor('lat-pulldown').some((e) => e.id === mine.id));
  const session: Session = {
    id: 'c',
    dayId: 'pull-a',
    startedAt: at(0).toISOString(),
    finishedAt: at(0).toISOString(),
    exercises: [{ exerciseId: mine.id, sets: [1, 2].map(() => ({ weight: 100, reps: 10, rir: 2, done: true })) }],
  };
  assert.equal(rollingVolume([session], at(1)).back, 2);
  setCustomExercises([]);
});

const iso = (d: Date) => d.toISOString();
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test('weight trend flags losing faster than 1% a week', () => {
  const now = at(14);
  const weights = [
    ...[1, 3, 5, 6].map((d) => ({ date: iso(at(14 - d)), lb: 218 })),
    ...[8, 10, 12].map((d) => ({ date: iso(at(14 - d)), lb: 221 })),
  ];
  const t = weightTrend(weights, now)!;
  assert.ok(t.pctPerWeek! < -1);
  assert.ok(t.fastLoss);
  const slow = weights.map((w) => ({ ...w, lb: w.lb === 221 ? 219 : w.lb }));
  assert.ok(!weightTrend(slow, now)!.fastLoss);
  // Too few weigh-ins: no trend yet, so nothing is flagged
  assert.equal(weightTrend(weights.slice(0, 2), now)!.pctPerWeek, null);
});

test('three short nights in a row, and missing nights do not count', () => {
  const now = at(10);
  const nights = (hours: (number | null)[]) =>
    hours.flatMap((h, i) => (h == null ? [] : [{ night: ymd(new Date(now.getTime() - i * DAY)), hours: h }]));
  assert.equal(shortNightStreak(nights([5, 5.5, 4, 8]), now), 3);
  assert.equal(shortNightStreak(nights([null, 5, 5, 5]), now), 3); // this morning not synced yet
  assert.equal(shortNightStreak(nights([5, null, 5, 5]), now), 1);
  assert.equal(shortNightStreak(nights([7, 5, 5, 5]), now), 0);
});

test('fast weight loss or short sleep pauses catch-up, never normal sets', () => {
  let sessions: Session[] = [];
  for (let d = 0; d < 10; d++) sessions = doSession(sessions, at(d));
  sessions = doSession(sessions, at(15));
  sessions = doSession(sessions, at(16));
  const now = at(17);
  const normal = planNext(sessions, settings, now);
  assert.ok(normal.exercises.some((e) => e.catchUpSets > 0));
  const tired: HealthData = {
    fetchedAt: iso(now),
    weights: [],
    sleep: [0, 1, 2].map((i) => ({ night: ymd(new Date(now.getTime() - i * DAY)), hours: 5 })),
  };
  const paused = planNext(sessions, settings, now, tired);
  assert.equal(paused.exercises.reduce((t, e) => t + e.catchUpSets, 0), 0);
  assert.ok(paused.notes.some((n) => n.includes('short nights')));
  // The workout itself is still there
  assert.ok(paused.exercises.every((e) => e.sets >= 2));
});

test('protein target is 1.6-2.2 g per kg', () => {
  assert.deepEqual(proteinTarget(220), { low: 160, high: 220 });
});

test('your own rotation order, and starting on any day', () => {
  const mine = { ...settings, rotation: ['legs-a', 'pull-a', 'push-a', 'legs-b', 'pull-b', 'push-b'] };
  assert.equal(nextDayId([], mine), 'legs-a');
  let sessions = doSession([], at(0));
  assert.equal(sessions[0].dayId, 'push-a'); // default settings started on Push A
  assert.equal(nextDayId(sessions, mine), 'legs-b'); // carries on after Push A in your order
  // Start somewhere else: the rotation carries on from what you did
  sessions = [{ ...sessions[0], dayId: 'pull-b' }];
  assert.equal(nextDayId(sessions, settings), 'legs-b');
  // A broken order falls back to the default
  assert.equal(nextDayId([], { ...settings, rotation: ['legs-a'] }), 'push-a');
});

test('rest suggestions: longer for heavy compounds, shorter for isolation', () => {
  assert.equal(restSeconds(exercise('hack-squat'), 2, false), 180);
  assert.equal(restSeconds(exercise('lat-pulldown'), 2, false), 150);
  assert.equal(restSeconds(exercise('db-lateral-raise'), 1, false), 90);
  assert.equal(restSeconds(exercise('db-lateral-raise'), 0, false), 120);
  assert.equal(restSeconds(exercise('db-lateral-raise'), 2, true), 60);
  assert.equal(formatClock(150), '2:30');
  assert.equal(formatClock(0.2), '0:01');
});

test('pain offers body parts for the day, and old shoulder logs still count', () => {
  assert.deepEqual(painAreasFor('push-a'), ['Shoulder', 'Elbow']);
  assert.deepEqual(painAreasFor('pull-b'), ['Back', 'Elbow']);
  assert.deepEqual(painAreasFor('legs-a'), ['Glute', 'Knee', 'Calf']);
  const old = doSession([], at(0), 10, 0);
  old[0].exercises[0] = { ...old[0].exercises[0], pain: undefined, shoulderPain: 6 };
  assert.equal(suggest('pl-incline-press', old, { comeback: false, deload: false }).weight, 90);
});

test('weekly recap uses fixed block weeks and skips the week in progress', () => {
  let sessions: Session[] = [];
  for (let d = 0; d < 7; d += 2) sessions = doSession(sessions, at(d + 0.1)); // week 1: days 0-6
  sessions = doSession(sessions, at(8)); // week 2, still in progress
  const recap = weeklyRecap(sessions, settings, at(9));
  assert.equal(recap.length, 1);
  assert.equal(recap[0].start.getTime(), start.getTime());
  assert.equal(recap[0].workouts, 4);
  assert.equal(recap[0].total, recap[0].rows.filter((r) => r.target > 0).length);
  assert.ok(recap[0].hit <= recap[0].total);
  const chest = recap[0].rows.find((r) => r.muscle === 'chest')!;
  assert.equal(chest.target, weeklyTarget('chest', 'cut', 0, false));
  // A later week with no workouts still shows, so a skipped week is visible
  const later = weeklyRecap(sessions, settings, at(22));
  assert.equal(later[0].workouts, 0);
  assert.equal(later.length, 3);
});

// ---------- Programs, goals and days a week ----------

const withProgram = (program: string, goal: Settings['goal'], daysPerWeek: number): Settings => ({ ...settings, program, goal, daysPerWeek });

test('every program day and exercise exists', () => {
  for (const p of PROGRAMS) {
    for (const id of p.days) {
      const d = day(id);
      assert.ok(d.exercises.length > 0, id);
      for (const x of d.exercises) assert.notEqual(exercise(x.exerciseId).name, 'Removed exercise', `${id} ${x.exerciseId}`);
      assert.ok(painAreasFor(id).length > 0, id);
    }
  }
});

test('suggested programs follow the goal and days a week', () => {
  const best = (g: Settings['goal'], d: number) => suggestPrograms(g!, d)[0];
  for (const g of ['strength', 'hypertrophy', 'endurance'] as const) assert.equal(best(g, 2).program.id, 'full-body');
  assert.equal(best('strength', 3).program.id, 'five-by-five');
  assert.equal(best('hypertrophy', 3).program.id, 'full-body');
  assert.equal(best('hypertrophy', 4).program.id, 'upper-lower');
  assert.equal(best('hypertrophy', 6).program.id, 'ppl');
  assert.equal(best('hypertrophy', 4).fit, 'best');
  // 5x5 is strength only, so it never fits a hypertrophy block
  assert.equal(suggestPrograms('hypertrophy', 3).find((f) => f.program.id === 'five-by-five')!.fit, 'other');
});

test('no program, goal or days saved means the original plan', () => {
  assert.equal(rotationFor(settings).join(), ROTATION.join());
  assert.equal(weeklyTarget('chest', 'cut', 0, false), weeklyTarget('chest', 'cut', 0, false, { goal: 'hypertrophy', daysPerWeek: 5 }));
});

test('strength uses heavier reps and fewer sets; endurance uses higher reps and short rest', () => {
  const strength = withProgram('upper-lower', 'strength', 4);
  const plan = planNext([], strength, at(0));
  const press = plan.exercises.find((e) => e.exerciseId === 'pl-incline-press')!;
  assert.deepEqual([press.repMin, press.repMax], [4, 6]);
  assert.ok(targetFor('chest', strength, 4, false) < targetFor('chest', withProgram('upper-lower', 'hypertrophy', 4), 4, false));
  assert.equal(withGoalReps('cable-fly', 'endurance').repMin, 15);
  assert.equal(restSeconds(withGoalReps('hack-squat', 'endurance'), 2, false, 'endurance'), 60);
  assert.equal(restSeconds(withGoalReps('hack-squat', 'strength'), 2, false, 'strength'), 180);
});

test('fewer days a week aims for fewer weekly sets', () => {
  const t = (d: number) => targetFor('quads', withProgram('full-body', 'hypertrophy', d), 4, false);
  assert.ok(t(2) < t(3) && t(3) < t(4) && t(4) < t(5));
  assert.equal(t(5), t(6));
});

test('5x5 keeps 5 sets of 5 and never adds catch-up', () => {
  const s = withProgram('five-by-five', 'strength', 3);
  let sessions: Session[] = [];
  for (let d = 0; d < 21; d += 4) {
    // Fewer sessions than planned, so a volume program would add catch-up here
    const plan = planNext(sessions, s, at(d));
    assert.ok(plan.day.id.startsWith('five-'));
    for (const e of plan.exercises) {
      assert.equal(e.catchUpSets, 0);
      assert.deepEqual([e.repMin, e.repMax], [5, 5]);
      assert.equal(e.sets, e.exerciseId === 'trap-bar-deadlift' ? 1 : 5);
    }
    sessions = [
      ...sessions,
      {
        id: `f${d}`,
        dayId: plan.day.id,
        startedAt: at(d).toISOString(),
        finishedAt: at(d).toISOString(),
        exercises: plan.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: Array.from({ length: e.sets }, () => ({ weight: 135, reps: 5, rir: 2, done: true })) })),
      },
    ];
  }
  // All 5 reps on every set: the weight goes up
  assert.equal(planNext(sessions, s, at(22)).exercises.find((e) => e.exerciseId === 'barbell-squat')!.suggestion.weight, 140);
});

test('plan 6 days but lift 4, and catch-up makes up the difference', () => {
  const s = withProgram('ppl', 'hypertrophy', 6);
  let sessions: Session[] = [];
  let added = 0;
  for (let d = 0; d < 28; d++) {
    if (![0, 1, 3, 4].includes(d % 7)) continue;
    const plan = planNext(sessions, s, at(d));
    if (d >= 7) added += plan.exercises.reduce((t, e) => t + e.catchUpSets, 0);
    sessions = [
      ...sessions,
      {
        id: `p${d}`,
        dayId: plan.day.id,
        startedAt: at(d).toISOString(),
        finishedAt: at(d).toISOString(),
        exercises: plan.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: Array.from({ length: e.sets }, () => ({ weight: 100, reps: 10, rir: 2, done: true })) })),
      },
    ];
  }
  assert.ok(added > 0);
});

test('a new program starts at its own first day', () => {
  const s = withProgram('upper-lower', 'hypertrophy', 4);
  const old = doSession([], at(0)); // a Push / Pull / Legs day
  assert.equal(nextDayId(old, s), 'upper-a');
  assert.deepEqual(rotationFor({ ...s, rotation: ROTATION }), PROGRAMS.find((p) => p.id === 'upper-lower')!.days);
});

test('1 rep max estimate and weight for reps', () => {
  assert.equal(estimate1RM(200, 1), 200);
  const max = estimate1RM(200, 10); // Epley 266.7, Brzycki 266.7
  assert.ok(Math.abs(max - 266.7) < 1);
  assert.ok(Math.abs(weightForReps(max, 10) - 200) < 1);
  assert.ok(weightForReps(max, 5) > weightForReps(max, 10));
});

test('a new goal with very different reps starts from an estimated 1 rep max', () => {
  // 10 reps at 200 for hypertrophy, then a strength block (4-6 reps)
  const s: Session = {
    id: 'g',
    dayId: 'push-a',
    startedAt: at(0).toISOString(),
    finishedAt: at(0).toISOString(),
    exercises: [{ exerciseId: 'pl-flat-press', sets: [1, 2, 3].map(() => ({ weight: 200, reps: 10, rir: 1, done: true })) }],
  };
  const r = suggest('pl-flat-press', [s], { comeback: false, deload: false, goal: 'strength' });
  // About 267 lb max; 4 reps with 2 in reserve is ~6 all-out, about 230
  assert.equal(r.targetReps, 4);
  assert.ok(r.weight! >= 220 && r.weight! <= 240, String(r.weight));
  assert.match(r.why, /1 rep max/);
  // Same goal: normal double progression
  assert.equal(suggest('pl-flat-press', [s], { comeback: false, deload: false }).weight, 210); // top of 6-10 hit, so +10
});

test('a backup round-trips, and bad files change nothing', () => {
  const sessions = doSession([], at(0));
  const raw = JSON.stringify(makeBackup(sessions, settings, at(1)));
  const read = readBackup(raw);
  assert.ok('backup' in read);
  if ('backup' in read) {
    assert.deepEqual(read.backup.sessions, sessions);
    assert.equal(read.backup.settings.mode, settings.mode);
    assert.equal(read.backup.settings.setupDone, true);
  }
  assert.ok('error' in readBackup('not json'));
  assert.ok('error' in readBackup(JSON.stringify({ sessions: [], settings: {} })));
  assert.match((readBackup(JSON.stringify({ ...JSON.parse(raw), version: 99 })) as { error: string }).error, /newer version/);
  assert.ok('error' in readBackup(JSON.stringify({ ...JSON.parse(raw), sessions: null })));
  assert.equal(backupFileName(new Date(2026, 0, 5)), 'lifting-backup-2026-01-05.json');
});

test('workout time: rest, sets and setup, rounded to 5 minutes', () => {
  // 3 sets of a compound: 90 + 3*45 + 2*150 = 525s, about 10 min
  assert.equal(estimateMinutes([{ exercise: exercise('lat-pulldown'), sets: 3 }], false), 10);
  // Plus an isolation exercise: 90 + 3*45 + 2*90 = 405s more, 930s in all, about 15 min
  assert.equal(
    estimateMinutes([{ exercise: exercise('lat-pulldown'), sets: 3 }, { exercise: exercise('pec-deck'), sets: 3 }], false),
    15
  );
  assert.equal(estimateMinutes([], false), 5);
});

test('stalls early in a block, or in a cut, get a recovery note, not a deload', () => {
  let sessions: Session[] = [];
  for (let d = 0; d < 18; d++) sessions = doSession(sessions, at(d), 8); // same weight and reps every time
  const now = at(18);
  const lifts = stalledLifts(sessions, settings, now);
  assert.ok(lifts.length >= 3);
  assert.equal(new Set(lifts).size, lifts.length); // each lift once

  // Week 3, build: recovery note
  const build = { ...settings, mode: 'build' as const };
  const early = stallCheck(sessions, build, now);
  assert.equal(early?.kind, 'recovery');
  assert.match(early!.text, /adds a minute/);

  // Week 5, build: a lighter week is worth considering
  const later = { ...build, blockStart: at(-14).toISOString() };
  assert.equal(stallCheck(sessions, later, now)?.kind, 'deload');

  // Week 5, cut: still a recovery note
  const cut = stallCheck(sessions, { ...later, mode: 'cut' }, now);
  assert.equal(cut?.kind, 'recovery');
  assert.match(cut!.text, /holding your weights is a win/);

  // Week 7: a lighter week either way
  assert.equal(stallCheck(sessions, { ...settings, blockStart: at(-30).toISOString() }, now)?.kind, 'deload');
});

test('a stuck lift gets an extra minute of rest', () => {
  assert.equal(restSeconds(exercise('lat-pulldown'), 2, false, 'hypertrophy', true), 210);
  assert.equal(restSeconds(exercise('lat-pulldown'), 2, true, 'hypertrophy', true), 120); // not on a deload
});

test('your own rest time replaces the default, and the extras still apply', () => {
  const custom = { compound: 120 };
  assert.equal(restSeconds(exercise('lat-pulldown'), 2, false, 'hypertrophy', false, custom), 120);
  assert.equal(restSeconds(exercise('lat-pulldown'), 0, false, 'hypertrophy', true, custom), 210); // +30 failure, +60 stalled
  assert.equal(restSeconds(exercise('pec-deck'), 2, false, 'hypertrophy', false, custom), 90); // other groups keep the default
});

// ---------- Strength + Size: heavy wave, then 5 sets of 10 ----------

test('Strength + Size waves the main lift and raises the training max after a good wave', () => {
  const s = withProgram('strength-size', 'strength', 4);
  // A squat from another program sets the first training max
  let sessions: Session[] = [
    {
      id: 'old',
      dayId: 'legs-a',
      startedAt: at(-3).toISOString(),
      finishedAt: at(-3).toISOString(),
      exercises: [{ exerciseId: 'barbell-squat', sets: [{ weight: 200, reps: 5, rir: 1, done: true }] }],
    },
  ];
  const tms: number[] = [];
  const weeks: number[] = [];
  for (let d = 0; d < 40; d += 2) {
    const plan = planNext(sessions, s, at(d));
    assert.ok(plan.day.id.startsWith('ss-'));
    for (const e of plan.exercises) assert.equal(e.catchUpSets, 0);
    const main = plan.exercises[0];
    assert.equal(main.setPlan?.length, 3);
    if (plan.day.id === 'ss-squat') {
      tms.push(main.trainingMax!);
      weeks.push(main.waveWeek!);
      const volume = plan.exercises.filter((e) => e.exerciseId === 'barbell-squat');
      // The 5 sets of 10 drop out in the light week
      assert.equal(volume.length, main.waveWeek === 3 ? 1 : 2);
      if (main.waveWeek !== 3) assert.deepEqual(volume[1].setPlan!.map((x) => x.reps), [10, 10, 10, 10, 10]);
      assert.equal(main.setPlan![2].asMany, main.waveWeek !== 3);
    }
    // Log every set as planned, with a couple of extra reps on the last heavy one
    sessions = [
      ...sessions,
      {
        id: `ss${d}`,
        dayId: plan.day.id,
        startedAt: at(d).toISOString(),
        finishedAt: at(d).toISOString(),
        exercises: plan.exercises.map((e) => ({
          exerciseId: e.exerciseId,
          ...(e.waveWeek != null ? { trainingMax: e.trainingMax, waveWeek: e.waveWeek } : {}),
          sets: (e.setPlan ?? Array.from({ length: e.sets }, () => ({ weight: 100, reps: 10 }))).map((x) => ({
            weight: x.weight ?? 100,
            reps: x.reps + ('asMany' in x && x.asMany ? 2 : 0),
            rir: 1,
            done: true,
          })),
        })),
      },
    ];
  }
  assert.deepEqual(weeks, [0, 1, 2, 3, 0]);
  // 90% of the estimated max from 200 x 5, then up 10 lb for a lower body lift
  const first = Math.round((estimate1RM(200, 5) * 0.9) / 5) * 5;
  assert.deepEqual(tms, [first, first, first, first, first + 10]);
});

test('Strength + Size holds the training max when a heavy set comes up short', () => {
  const s = withProgram('strength-size', 'strength', 4);
  const log = (d: number, week: number, reps: number): Session => ({
    id: `b${d}`,
    dayId: 'ss-bench',
    startedAt: at(d).toISOString(),
    finishedAt: at(d).toISOString(),
    exercises: [{ exerciseId: 'barbell-bench', trainingMax: 200, waveWeek: week, sets: [{ weight: 190, reps, rir: 0, done: true }] }],
  });
  // The last set of the week of 3s only got 2
  const sessions = [log(0, 0, 6), log(7, 1, 2), log(14, 2, 2), log(21, 3, 5)];
  const plan = planNext(sessions, { ...s, nextDayOverride: 'ss-bench' }, at(28));
  const main = plan.exercises[0];
  assert.equal(main.waveWeek, 0);
  assert.equal(main.trainingMax, 200);
  // A made wave goes up 5 lb for an upper body lift
  const good = [log(0, 0, 6), log(7, 1, 4), log(14, 2, 2), log(21, 3, 5)];
  assert.equal(planNext(good, { ...s, nextDayOverride: 'ss-bench' }, at(28)).exercises[0].trainingMax, 205);
});

test('Strength + Size asks for a starting weight the first time', () => {
  const plan = planNext([], withProgram('strength-size', 'strength', 4), at(0));
  const main = plan.exercises[0];
  assert.equal(main.suggestion.weight, null);
  assert.equal(main.trainingMax, undefined);
  assert.ok(main.suggestion.why.startsWith('First time'));
});

// ---------- Strength Waves: your own maxes, the whole cycle ----------

test('Strength Waves starts from the training max you enter and works out the whole cycle', () => {
  const tm = trainingMaxFrom1RM(300); // 270
  assert.equal(tm, 270);
  const s: Settings = {
    ...withProgram('strength-waves', 'strength', 4),
    trainingMaxes: { 'barbell-squat': { lb: tm, setAt: at(-1).toISOString() } },
  };
  // An older squat logged with a different training max is ignored
  const old: Session = {
    id: 'old',
    dayId: 'sw-squat',
    startedAt: at(-5).toISOString(),
    finishedAt: at(-5).toISOString(),
    exercises: [{ exerciseId: 'barbell-squat', trainingMax: 400, waveWeek: 0, sets: [{ weight: 340, reps: 5, rir: 1, done: true }] }],
  };
  const plan = planNext([old], { ...s, nextDayOverride: 'sw-squat', blockStart: at(0).toISOString() }, at(0));
  const main = plan.exercises[0];
  assert.equal(main.trainingMax, 270);
  assert.equal(main.waveWeek, 0);
  assert.deepEqual(main.setPlan!.map((x) => x.weight), [175, 205, 230]);
  assert.deepEqual(main.setPlan!.map((x) => x.reps), [5, 5, 5]);
  assert.ok(main.setPlan![2].asMany);
  // Then 5 sets of 5 at the first set's weight
  const fsl = plan.exercises[1];
  assert.equal(fsl.exerciseId, 'barbell-squat');
  assert.deepEqual(fsl.setPlan, Array.from({ length: 5 }, () => ({ weight: 175, reps: 5 })));
  for (const e of plan.exercises) assert.equal(e.catchUpSets, 0);

  // The full cycle preview: 5s, 3s, then 5, 3 and 1, then a light week
  const cycle = cycleFor(270, 'fsl');
  assert.deepEqual(cycle.map((w) => w.sets.map((x) => x.weight)), [
    [175, 205, 230],
    [190, 215, 245],
    [205, 230, 255],
    [110, 135, 160],
  ]);
  assert.deepEqual(cycle.map((w) => w.sets.map((x) => x.reps)), [[5, 5, 5], [3, 3, 3], [5, 3, 1], [5, 5, 5]]);
  assert.equal(cycle[3].after, null);
  assert.deepEqual(cycle[1].after, { sets: 5, reps: 5, weight: 190 });
});

test('Strength Waves runs all 4 weeks and drops the 5 sets of 5 in the light week', () => {
  const s: Settings = {
    ...withProgram('strength-waves', 'strength', 4),
    trainingMaxes: { 'barbell-bench': { lb: 200, setAt: at(-1).toISOString() } },
  };
  let sessions: Session[] = [];
  const weeks: number[] = [];
  const tms: number[] = [];
  for (let d = 0; d < 40; d += 2) {
    const plan = planNext(sessions, s, at(d));
    assert.ok(plan.day.id.startsWith('sw-'));
    if (plan.day.id === 'sw-bench') {
      weeks.push(plan.exercises[0].waveWeek!);
      tms.push(plan.exercises[0].trainingMax!);
      const bench = plan.exercises.filter((e) => e.exerciseId === 'barbell-bench');
      assert.equal(bench.length, plan.exercises[0].waveWeek === 3 ? 1 : 2);
    }
    sessions = [
      ...sessions,
      {
        id: `f${d}`,
        dayId: plan.day.id,
        startedAt: at(d).toISOString(),
        finishedAt: at(d).toISOString(),
        exercises: plan.exercises.map((e) => ({
          exerciseId: e.exerciseId,
          ...(e.waveWeek != null ? { trainingMax: e.trainingMax, waveWeek: e.waveWeek } : {}),
          sets: (e.setPlan ?? Array.from({ length: e.sets }, () => ({ weight: 100, reps: 10 }))).map((x) => ({
            weight: x.weight ?? 100,
            reps: x.reps + ('asMany' in x && x.asMany ? 2 : 0),
            rir: 1,
            done: true,
          })),
        })),
      },
    ];
  }
  assert.deepEqual(weeks, [0, 1, 2, 3, 0]);
  // From the number you entered, then up 5 lb after a made cycle
  assert.deepEqual(tms, [200, 200, 200, 200, 205]);
});

// ---------- Warm-up sets ----------

test('warm-ups ramp up to the first working set and skip what is already warm', () => {
  // First big lift of the day: bar, then about 40/60/80%
  assert.deepEqual(warmUpSets({ exerciseId: 'barbell-bench', firstWeight: 225, earlier: [] }), [
    { weight: 45, reps: 10 },
    { weight: 90, reps: 5 },
    { weight: 135, reps: 3 },
    { weight: 180, reps: 2 },
  ]);
  // A light working weight drops sets that would be under the bar or too close
  assert.deepEqual(warmUpSets({ exerciseId: 'barbell-ohp', firstWeight: 65, earlier: [] }), [{ weight: 45, reps: 10 }]);
  // A second chest press gets one set
  assert.deepEqual(warmUpSets({ exerciseId: 'db-incline-press', firstWeight: 60, earlier: ['barbell-bench'] }), [{ weight: 35, reps: 5 }]);
  // The same lift again, isolation work, assisted lifts and unknown weights get none
  assert.deepEqual(warmUpSets({ exerciseId: 'barbell-bench', firstWeight: 135, earlier: ['barbell-bench'] }), []);
  assert.deepEqual(warmUpSets({ exerciseId: 'cable-fly', firstWeight: 40, earlier: [] }), []);
  assert.deepEqual(warmUpSets({ exerciseId: 'assisted-pullup', firstWeight: 60, earlier: [] }), []);
  assert.deepEqual(warmUpSets({ exerciseId: 'barbell-squat', firstWeight: null, earlier: [] }), []);
  // Machines have no bar
  assert.deepEqual(warmUpSets({ exerciseId: 'lat-pulldown', firstWeight: 150, earlier: [] }), [
    { weight: 60, reps: 5 },
    { weight: 90, reps: 3 },
    { weight: 120, reps: 2 },
  ]);
});

test('wave lifts warm up with 40, 50 and 60% of the training max', () => {
  assert.deepEqual(warmUpSets({ exerciseId: 'barbell-squat', firstWeight: 175, earlier: [], trainingMax: 270, waveWeek: 0 }), [
    { weight: 45, reps: 10 },
    { weight: 110, reps: 5 },
    { weight: 135, reps: 5 },
    { weight: 160, reps: 3 },
  ]);
  // The light week starts at 40% already, so just the bar
  assert.deepEqual(warmUpSets({ exerciseId: 'barbell-squat', firstWeight: 110, earlier: [], trainingMax: 270, waveWeek: 3 }), [
    { weight: 45, reps: 10 },
  ]);
});

test('Strength Waves can pair each main lift with 5 sets of 10 of its partner lift', () => {
  const setAt = at(-1).toISOString();
  const s: Settings = {
    ...withProgram('strength-waves', 'strength', 4),
    programVariant: 'paired',
    trainingMaxes: { 'barbell-ohp': { lb: 100, setAt }, 'barbell-bench': { lb: 200, setAt } },
  };
  const press = planNext([], { ...s, nextDayOverride: 'swp-press' }, at(0));
  assert.equal(press.day.id, 'swp-press');
  assert.equal(press.exercises[0].trainingMax, 100);
  // Bench 5 x 10 at 50% of the bench training max in week 1
  const bench = press.exercises[1];
  assert.equal(bench.exerciseId, 'barbell-bench');
  assert.deepEqual(bench.setPlan, Array.from({ length: 5 }, () => ({ weight: 100, reps: 10 })));
  assert.equal(bench.trainingMax, undefined);
  // Pulldowns 5 x 10
  assert.equal(press.exercises[2].sets, 5);
  assert.equal(press.exercises[2].repMin, 10);
  // A partner lift with no training max yet asks for a weight
  const dead = planNext([], { ...s, nextDayOverride: 'swp-deadlift' }, at(0)).exercises[1];
  assert.equal(dead.exerciseId, 'barbell-squat');
  assert.equal(dead.suggestion.weight, null);
  // The cycle preview uses the partner's training max, and skips the light week
  const cycle = cycleFor(100, 'paired', 200);
  assert.deepEqual(cycle.map((w) => w.after?.weight ?? null), [100, 110, 120, null]);
  // The default is still 5 x 5 of the same lift
  const plain = planNext([], { ...s, programVariant: undefined, nextDayOverride: 'sw-press' }, at(0));
  assert.equal(plain.exercises[1].exerciseId, 'barbell-ohp');
  // Logging the bench 5 x 10 doesn't move the bench training max
  const logged: Session = {
    id: 'p1',
    dayId: 'swp-press',
    startedAt: at(0).toISOString(),
    finishedAt: at(0).toISOString(),
    exercises: [{ exerciseId: 'barbell-bench', sets: [{ weight: 100, reps: 10, rir: 3, done: true }] }],
  };
  const benchDay = planNext([logged], { ...s, nextDayOverride: 'swp-bench' }, at(2));
  assert.equal(benchDay.exercises[0].trainingMax, 200);
  assert.equal(benchDay.exercises[1].exerciseId, 'barbell-ohp');
});
