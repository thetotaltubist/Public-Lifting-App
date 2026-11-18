import { Exercise, Goal, RestGroup, Settings } from './types';

// ------------------------------------------------------------------
// Suggested rest between sets. Longer rest (2 minutes or more) lets you
// keep reps up on the next set, which builds more muscle than short rest
// on big lifts. Beyond about 90 seconds, extra rest helps isolation work
// little. Endurance work keeps rest short on purpose: training while
// partly tired is what builds the ability to keep going. See science.ts.
// ------------------------------------------------------------------

// A lift that has stalled gets an extra minute: longer rest lets you keep
// your reps up, which is often all a stall early in a block needs
export const STALLED_EXTRA_SECONDS = 60;

// Lifts fall into three rest groups. Each has a default you can change
// in Settings; the extras (failure, deload, a stalled lift) still apply.
export const REST_GROUPS: { group: RestGroup; name: string; detail: string }[] = [
  { group: 'heavy', name: 'Heavy lifts', detail: '6 reps or fewer, like a heavy squat or press' },
  { group: 'compound', name: 'Other compound lifts', detail: 'Presses, rows, pulldowns, leg press' },
  { group: 'isolation', name: 'Isolation work', detail: 'Curls, raises, flyes, extensions' },
];
export const REST_MIN = 30;
export const REST_MAX = 300;

export function restGroup(e: Exercise): RestGroup {
  return e.kind === 'isolation' ? 'isolation' : e.repMin <= 6 ? 'heavy' : 'compound';
}

export function defaultRest(group: RestGroup, goal: Goal = 'hypertrophy') {
  if (goal === 'endurance') return 60;
  return group === 'isolation' ? 90 : group === 'heavy' ? 180 : 150;
}

export function restFor(group: RestGroup, goal: Goal, custom?: Settings['rest']) {
  return custom?.[group] ?? defaultRest(group, goal);
}

export function restSeconds(
  e: Exercise,
  rir: number | null,
  deload: boolean,
  goal: Goal = 'hypertrophy',
  stalled = false,
  custom?: Settings['rest']
) {
  return baseRest(e, rir, deload, goal, custom) + (stalled && !deload ? STALLED_EXTRA_SECONDS : 0);
}

function baseRest(e: Exercise, rir: number | null, deload: boolean, goal: Goal, custom?: Settings['rest']) {
  let seconds = restFor(restGroup(e), goal, custom);
  if (rir === 0) seconds += 30; // a set to failure needs a bit longer
  if (deload && goal !== 'endurance') seconds -= 30; // lighter sets recover faster
  return Math.max(REST_MIN, seconds);
}

export function restReason(
  e: Exercise,
  rir: number | null,
  deload: boolean,
  goal: Goal = 'hypertrophy',
  stalled = false,
  custom?: Settings['rest']
) {
  const base = baseReason(e, rir, deload, goal) + (custom?.[restGroup(e)] != null ? ' (your rest time)' : '');
  return stalled && !deload ? `${base}, plus 1 min while this lift is stuck` : base;
}

function baseReason(e: Exercise, rir: number | null, deload: boolean, goal: Goal) {
  if (goal === 'endurance') return rir === 0 ? 'Endurance: short rest, plus 30s after a set to failure' : 'Endurance: short rest';
  const g = restGroup(e);
  const base = g === 'isolation' ? 'Isolation work' : g === 'heavy' ? 'Heavy compound lift' : 'Compound lift';
  const extra = rir === 0 ? ', plus 30s after a set to failure' : deload ? ', a bit shorter on a deload' : '';
  return `${base}${extra}`;
}

export function formatClock(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ------------------------------------------------------------------
// About how long a workout takes, rest included. Each set is about 45
// seconds of work, each exercise about 90 seconds to set up and warm
// up, and the rest between sets is the suggested rest above. Rounded
// to the nearest 5 minutes, since it's only a guide.
// ------------------------------------------------------------------

export const SET_SECONDS = 45;
export const SETUP_SECONDS = 90;

export function estimateMinutes(
  items: { exercise: Exercise; sets: number; repMin?: number }[],
  deload: boolean,
  goal: Goal = 'hypertrophy',
  custom?: Settings['rest']
) {
  let seconds = 0;
  for (const { exercise, sets, repMin } of items) {
    if (sets <= 0) continue;
    const e = repMin != null ? { ...exercise, repMin } : exercise;
    seconds += SETUP_SECONDS + sets * SET_SECONDS + (sets - 1) * restSeconds(e, null, deload, goal, false, custom);
  }
  return Math.max(5, Math.round(seconds / 300) * 5);
}
