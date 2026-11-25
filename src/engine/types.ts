// ------------------------------------------------------------------
// Shapes shared by the training engine and the screens.
// Weights are always stored in pounds; screens convert for kg.
// ------------------------------------------------------------------

export type Muscle =
  | 'chest'
  | 'back'
  | 'frontDelts'
  | 'sideDelts'
  | 'rearDelts'
  | 'triceps'
  | 'biceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs';

export type Exercise = {
  id: string;
  name: string;
  primary: Muscle;
  secondary: Muscle[]; // each set counts as half a set for these
  repMin: number;
  repMax: number;
  kind: 'compound' | 'isolation';
  increment: number; // lb added when the top of the rep range is reached
  shoulderCheck?: boolean; // no longer used: every exercise asks about pain now
  tip?: string;
};

export type DayTemplate = {
  id: string;
  name: string;
  // reps overrides the goal's rep range for this slot (5x5 is always 5)
  // wave: a main lift on the 4-week wave, or the lighter sets that follow it on the same lift:
  // 5 sets of 10 (Strength + Size) or 5 sets of 5 at the first set's weight (Strength Waves).
  // paired: 5 sets of 10 of another wave lift, from that lift's training max. See wave.ts.
  exercises: { exerciseId: string; baseSets: number; reps?: [number, number]; wave?: 'main' | 'volume' | 'fsl' | 'paired' }[];
  painAreas?: string[]; // body parts offered for a pain rating; missing uses the day id
};

export type LoggedSet = {
  weight: number | null; // lb
  reps: number | null;
  rir: number | null; // reps in reserve
  done: boolean;
};

export type LoggedExercise = {
  exerciseId: string;
  sets: LoggedSet[];
  catchUpSets?: number;
  pain?: number | null; // 0-10, joint or muscle pain during this exercise
  painArea?: string | null; // where it hurt, e.g. 'Shoulder'
  shoulderPain?: number | null; // older logs, before pain covered any joint or muscle
  trainingMax?: number; // lb, wave main lifts only (Strength + Size, Strength Waves)
  waveWeek?: number; // 0-3, wave main lifts only
  warmUpsDone?: number[]; // warm-up sets checked off during the workout, by index; not saved with the session
};

export type Session = {
  id: string;
  dayId: string;
  startedAt: string; // ISO
  finishedAt: string; // ISO
  deload?: boolean;
  exercises: LoggedExercise[];
};

export type Mode = 'cut' | 'build';

// What the block is for. Changes reps, rest, how close to failure, and
// how many weekly sets the app aims for. See programs.ts.
export type Goal = 'strength' | 'hypertrophy' | 'endurance';
export type RestGroup = 'heavy' | 'compound' | 'isolation';

export type Settings = {
  mode: Mode;
  unit: 'lb' | 'kg';
  blockStart: string; // ISO, start of the current training block
  deloadStart: string | null; // ISO, set while a deload week is running
  lastDeloadEnd: string | null; // ISO
  swaps: Record<string, string>; // template exercise id -> replacement id, on every day it appears
  customExercises: Exercise[]; // exercises and machines you added yourself
  nextDayOverride: string | null;
  rotation?: string[]; // day ids in your own order; missing means the program's order
  program?: string; // program id; missing means Push / Pull / Legs
  programVariant?: string; // a program's own option, like Strength Waves' paired 5 sets of 10; missing means the first
  goal?: Goal; // missing means hypertrophy
  daysPerWeek?: number; // how many days a week you plan to lift; missing means 5
  setupDone?: boolean; // finished the first-run setup; missing means not yet
  painCheck?: boolean; // ask for a 0-10 pain rating after each exercise; missing means on
  rest?: Partial<Record<RestGroup, number>>; // your own rest in seconds per group; missing means the default
  workoutView?: 'list' | 'focus'; // how the workout screen looks; missing means the list
  warmUps?: boolean; // show warm-up sets before the working sets; missing means off
  // Training maxes you typed in, per exercise id (lb). Wave lifts start from
  // these and progress from your logged sets after setAt.
  trainingMaxes?: Record<string, { lb: number; setAt: string }>;
};
