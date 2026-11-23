import { estimate1RM } from './oneRm';
import { exercise } from './exercises';
import { roundTo } from './progression';
import { Session, Settings } from './types';

// ------------------------------------------------------------------
// Strength + Size: a 4-week wave on one main lift a day, then 5 sets of
// 10 on the same lift.
//
// Weights come from a training max: about 90% of your estimated 1 rep
// max, so the heavy sets start a little easy. Each main lift moves
// through 3 heavy weeks (sets of 5, sets of 3, then 5, 3 and 1) and a
// light week. The last
// heavy set of each week is "as many as you can with good form". If
// those last sets made their reps, the training max goes up 5 lb for
// upper body lifts and 10 lb for lower body at the start of the next
// wave. If not, it holds.
//
// The week is counted from how many times you've done that day this
// block, not the calendar, so a missed week never skips a step.
// ------------------------------------------------------------------

export type WaveRole = 'main' | 'volume';

export type PlannedSet = { weight: number | null; reps: number; asMany?: boolean };

export type WavePlan = {
  week: number; // 0-3; 3 is the light week
  trainingMax: number | null;
  sets: PlannedSet[];
  why: string;
};

export const TRAINING_MAX = 0.9; // of the estimated 1 rep max

// Percent of training max and reps for the main lift's 3 sets each week
export const WAVE: { percent: number; reps: number }[][] = [
  [
    { percent: 0.65, reps: 5 },
    { percent: 0.75, reps: 5 },
    { percent: 0.85, reps: 5 },
  ],
  [
    { percent: 0.7, reps: 3 },
    { percent: 0.8, reps: 3 },
    { percent: 0.9, reps: 3 },
  ],
  [
    { percent: 0.75, reps: 5 },
    { percent: 0.85, reps: 3 },
    { percent: 0.95, reps: 1 },
  ],
  [
    { percent: 0.4, reps: 5 },
    { percent: 0.5, reps: 5 },
    { percent: 0.6, reps: 5 },
  ],
];

export const LIGHT_WEEK = 3;
export const WEEK_NAMES = ['Week of 5s', 'Week of 3s', 'Heavy week', 'Light week'];

// The 5 sets of 10 get a little heavier over the 3 heavy weeks, and are
// skipped in the light week.
export const VOLUME_SETS = 5;
export const VOLUME_REPS = 10;
export const VOLUME_PERCENT = [0.5, 0.55, 0.6];

export function trainingMaxStep(exerciseId: string) {
  const m = exercise(exerciseId).primary;
  return m === 'quads' || m === 'hamstrings' || m === 'glutes' ? 10 : 5;
}

// Which week of the wave this day is on: how many times it's been done
// since the block started. A deload week runs the light week.
export function waveWeek(dayId: string, sessions: Session[], settings: Settings, deload: boolean) {
  if (deload) return LIGHT_WEEK;
  const done = sessions.filter((s) => s.dayId === dayId && s.finishedAt >= settings.blockStart && !s.deload).length;
  return done % WAVE.length;
}

type MainEntry = { trainingMax: number; week: number; sets: { weight: number; reps: number }[] };

// Main-lift entries logged with a training max, newest first
function mainHistory(exerciseId: string, sessions: Session[]): MainEntry[] {
  const out: (MainEntry & { date: string })[] = [];
  for (const s of sessions) {
    for (const ex of s.exercises) {
      if (ex.exerciseId !== exerciseId || ex.trainingMax == null || ex.waveWeek == null) continue;
      const sets = ex.sets.filter((x) => x.done && x.weight != null && (x.reps ?? 0) > 0) as { weight: number; reps: number }[];
      if (sets.length) out.push({ date: s.finishedAt, trainingMax: ex.trainingMax, week: ex.waveWeek, sets });
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

// Best estimated 1 rep max from the last few times you did this lift.
// Sets past 10 reps are left out, since the estimate gets loose there.
function recentBest(exerciseId: string, sessions: Session[]) {
  const dated = sessions
    .flatMap((s) => s.exercises.filter((e) => e.exerciseId === exerciseId).map((e) => ({ date: s.finishedAt, e })))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  let best = 0;
  for (const { e } of dated) {
    for (const x of e.sets) {
      if (x.done && x.weight != null && x.reps != null && x.reps > 0 && x.reps <= 10) best = Math.max(best, estimate1RM(x.weight, x.reps));
    }
  }
  return best;
}

// Did the last heavy set make its reps? Light weeks don't count.
function madeReps(entry: MainEntry) {
  if (entry.week === LIGHT_WEEK) return true;
  const target = WAVE[entry.week][2];
  const top = Math.max(...entry.sets.map((s) => s.weight));
  const topSet = entry.sets.filter((s) => s.weight === top);
  return topSet.some((s) => s.reps >= target.reps);
}

export function trainingMaxFor(
  exerciseId: string,
  sessions: Session[],
  week: number
): { trainingMax: number | null; note: string } {
  const history = mainHistory(exerciseId, sessions);
  const step = trainingMaxStep(exerciseId);
  if (!history.length) {
    const best = recentBest(exerciseId, sessions);
    if (!best) return { trainingMax: null, note: '' };
    const tm = roundTo(best * TRAINING_MAX, 5);
    return { trainingMax: tm, note: `Your training max is ${tm} lb: 90% of your estimated 1 rep max of about ${Math.round(best)} lb.` };
  }
  const last = history[0];
  if (week !== 0) return { trainingMax: last.trainingMax, note: `Training max ${last.trainingMax} lb.` };

  // A new wave: look back over the last one, up to where it started
  const end = history.findIndex((h) => h.week === 0);
  const lastWave = history.slice(0, end === -1 ? history.length : end + 1).filter((h) => h.trainingMax === last.trainingMax);
  if (lastWave.every(madeReps)) {
    const tm = last.trainingMax + step;
    return { trainingMax: tm, note: `New wave: you made your reps last time, so your training max goes up ${step} lb to ${tm} lb.` };
  }
  return {
    trainingMax: last.trainingMax,
    note: `New wave: a heavy set came up short last time, so your training max stays at ${last.trainingMax} lb. Repeat the wave and beat those reps.`,
  };
}

export function planWave(role: WaveRole, exerciseId: string, dayId: string, sessions: Session[], settings: Settings, deload: boolean): WavePlan {
  const week = waveWeek(dayId, sessions, settings, deload);
  const { trainingMax, note } = trainingMaxFor(exerciseId, sessions, week);
  const at = (p: number) => (trainingMax == null ? null : roundTo(trainingMax * p, 5));

  if (role === 'volume') {
    if (week === LIGHT_WEEK) return { week, trainingMax, sets: [], why: '' };
    const p = VOLUME_PERCENT[week];
    return {
      week,
      trainingMax,
      sets: Array.from({ length: VOLUME_SETS }, () => ({ weight: at(p), reps: VOLUME_REPS })),
      why:
        trainingMax == null
          ? 'First time: pick a weight you could lift for about 15 reps, and do 5 sets of 10 with it.'
          : `5 sets of 10 at ${Math.round(p * 100)}% of your training max. These should feel steady, not hard. Keep the rest short if you can.`,
    };
  }

  const sets = WAVE[week].map((s, i) => ({ weight: at(s.percent), reps: s.reps, asMany: week !== LIGHT_WEEK && i === 2 }));
  if (trainingMax == null) {
    return {
      week,
      trainingMax,
      sets,
      why: 'First time: work up to a weight you could lift for about 5 reps with 1 or 2 left in the tank, and log your sets. The app sets your training max from it.',
    };
  }
  const last = sets[2];
  const why =
    week === LIGHT_WEEK
      ? `Light week: 3 easy sets of 5 to recover before the next wave. ${note}`
      : `${WEEK_NAMES[week]}. Last set: as many good reps as you can, at least ${last.reps}, stopping 1 short of failure. ${note}`;
  return { week, trainingMax, sets, why };
}
