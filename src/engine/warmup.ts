import { exercise } from './exercises';
import { roundTo } from './progression';
import { LIGHT_WEEK, PlannedSet } from './wave';

// ------------------------------------------------------------------
// Warm-up sets (optional, Settings > Warm-up sets).
//
// A few lighter sets that build up to your first working set. They use
// few reps, fewer as the weight goes up, so they warm you up without
// tiring you out, and they don't count toward your weekly sets.
//
// - The first big lift for a muscle today gets the full ramp: the empty
//   bar for 10 (barbell lifts), then about 40%, 60% and 80% of your first
//   working weight for 5, 3 and 2.
// - A later big lift for a muscle that's already warm gets one set at
//   about 60% for 5.
// - The same lift again (the 5 sets of 10 after the heavy sets) and
//   isolation work get none.
// - Wave lifts (Strength + Size, Strength Waves) use the usual 40%, 50% and 60% of
//   the training max for 5, 5 and 3. The light week just gets the bar.
// - No working weight yet (first time) means no warm-up sets: pick your
//   weight first.
// ------------------------------------------------------------------

export const BAR = 45; // lb

export const RAMP = [
  { percent: 0.4, reps: 5 },
  { percent: 0.6, reps: 3 },
  { percent: 0.8, reps: 2 },
];
export const SECOND_LIFT = { percent: 0.6, reps: 5 };
export const WAVE_RAMP = [
  { percent: 0.4, reps: 5 },
  { percent: 0.5, reps: 5 },
  { percent: 0.6, reps: 3 },
];

export function usesBar(exerciseId: string) {
  return exerciseId.startsWith('barbell-') || exerciseId === 'trap-bar-deadlift';
}

export type WarmUpInput = {
  exerciseId: string;
  firstWeight: number | null; // lb, the first working set
  earlier: string[]; // exercise ids that come before this one today
  trainingMax?: number; // wave main lifts
  waveWeek?: number;
};

export function warmUpSets({ exerciseId, firstWeight, earlier, trainingMax, waveWeek }: WarmUpInput): PlannedSet[] {
  const e = exercise(exerciseId);
  if (e.kind !== 'compound' || e.increment <= 0) return []; // assisted lifts: less weight is harder
  if (earlier.includes(exerciseId)) return [];
  if (firstWeight == null || firstWeight <= 0) return [];
  const bar = usesBar(exerciseId);
  const step = Math.abs(e.increment) >= 10 ? 10 : 5;

  let steps: { weight: number; reps: number }[];
  if (trainingMax != null && waveWeek != null) {
    steps = waveWeek === LIGHT_WEEK ? [] : WAVE_RAMP.map((s) => ({ weight: roundTo(trainingMax * s.percent, 5), reps: s.reps }));
  } else if (earlier.some((id) => exercise(id).kind === 'compound' && exercise(id).primary === e.primary)) {
    steps = [{ weight: roundTo(firstWeight * SECOND_LIFT.percent, step), reps: SECOND_LIFT.reps }];
  } else {
    steps = RAMP.map((s) => ({ weight: roundTo(firstWeight * s.percent, step), reps: s.reps }));
  }
  const alreadyWarm = earlier.some((id) => exercise(id).primary === e.primary);
  if (bar && !alreadyWarm) steps.unshift({ weight: BAR, reps: 10 });

  // Each set lighter than the first working set and clearly heavier than the one before
  const out: PlannedSet[] = [];
  for (const s of steps) {
    if (s.weight <= 0 || (bar && s.weight < BAR)) continue;
    if (s.weight >= firstWeight) continue;
    // At least 10 lb apart, so no set is a near-copy of the one before
    const prev = out.at(-1)?.weight;
    if (prev != null && s.weight < prev + 10) continue;
    out.push({ weight: s.weight, reps: s.reps });
  }
  return out;
}

// Warm-ups for every exercise in a workout, in order
export function warmUpsForDay(list: Omit<WarmUpInput, 'earlier'>[]): PlannedSet[][] {
  return list.map((x, i) => warmUpSets({ ...x, earlier: list.slice(0, i).map((y) => y.exerciseId) }));
}
