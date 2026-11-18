import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { MUSCLE_NAMES } from '../engine/exercises';
import { formatClock } from '../engine/rest';
import { Exercise, LoggedExercise, LoggedSet, Session, Settings } from '../engine/types';
import { PlannedExercise } from '../engine/plan';
import { fromDisplay, toDisplay } from '../storage';
import { colors } from '../theme';
import type { Rest } from './RestTimer';

// ------------------------------------------------------------------
// Focus mode: one exercise fills the screen, with big numbers and one
// button. After each set the rest timer takes over and shows what's
// next. It logs exactly the same sets as the list view; it's only a
// different way of looking at the same workout.
// ------------------------------------------------------------------

type Props = {
  dayName: string;
  exercises: LoggedExercise[];
  planned: (PlannedExercise | undefined)[];
  sessions: Session[];
  settings: Settings;
  rest: Rest | null;
  timeLeft: string;
  liftFor: (i: number, id: string) => Exercise;
  changeSet: (i: number, j: number, change: Partial<LoggedSet>) => void;
  completeSet: (i: number, j: number, fill: Partial<LoggedSet>) => void;
  changeExercise: (i: number, change: (ex: LoggedExercise) => LoggedExercise) => void;
  painAreas: string[];
  changeRest: (r: Rest) => void;
  stopRest: () => void;
  swap: (i: number) => void;
  finish: () => void;
  leave: () => void;
  showList: () => void;
};

const RIR_CHOICES = [0, 1, 2, 3, 4];

function firstOpen(ex: LoggedExercise) {
  return ex.sets.findIndex((s) => !s.done);
}

function lastTime(id: string, sessions: Session[], unit: Settings['unit']) {
  for (let k = sessions.length - 1; k >= 0; k--) {
    const ex = sessions[k].exercises.find((e) => e.exerciseId === id);
    const sets = ex?.sets.filter((s) => s.done && s.reps != null);
    if (sets?.length) {
      const w = sets[0].weight;
      return `${w != null ? `${toDisplay(w, unit)} ${unit} × ` : ''}${sets.map((s) => s.reps).join(', ')}`;
    }
  }
  return null;
}

export default function FocusWorkout(p: Props) {
  const { exercises, settings } = p;
  const unit = settings.unit;
  const firstUnfinished = () => {
    const k = exercises.findIndex((ex) => firstOpen(ex) >= 0);
    return k >= 0 ? k : exercises.length - 1;
  };
  const [index, setIndex] = useState(firstUnfinished);
  const [lastLogged, setLastLogged] = useState<{ i: number; j: number } | null>(null);
  const sorted = [...p.sessions].sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));

  const i = Math.min(index, exercises.length - 1);
  const ex = exercises[i];
  const e = p.liftFor(i, ex.exerciseId);
  const plan = p.planned[i];
  const j = firstOpen(ex);
  const allDone = exercises.every((x) => firstOpen(x) < 0);
  const catchUp = ex.catchUpSets ?? 0;
  const plannedSets = plan?.sets ?? ex.sets.length;
  const isCatchUp = (k: number) => catchUp > 0 && k >= plannedSets - catchUp && k < plannedSets;

  const set = j >= 0 ? ex.sets[j] : null;
  const defaultReps = plan?.suggestion.targetReps ?? Math.round((e.repMin + e.repMax) / 2);
  const reps = set?.reps ?? defaultReps;
  const step = unit === 'kg' ? (fromDisplay('2.5', 'kg') ?? 5.5) : e.increment || 5;

  function done() {
    if (j < 0 || !set) return;
    if (set.weight == null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    p.completeSet(i, j, { reps });
    setLastLogged({ i, j });
    // Last set of this exercise: move on to the next one with sets left
    if (ex.sets.every((s, k) => k === j || s.done)) {
      const next = exercises.findIndex((x, k) => k > i && firstOpen(x) >= 0);
      if (next >= 0) setIndex(next);
    }
  }

  // ---- Resting: the timer takes over ----
  if (p.rest && lastLogged) {
    const logged = exercises[lastLogged.i];
    const loggedSet = logged.sets[lastLogged.j];
    const upNext = (() => {
      if (allDone || j < 0) return null;
      const lift = p.liftFor(i, ex.exerciseId);
      const range = lift.repMin === lift.repMax ? `${lift.repMin}` : `${lift.repMin}–${lift.repMax}`;
      if (i !== lastLogged.i) return { title: lift.name, sub: `${ex.sets.length} sets · ${range} reps` };
      const w = ex.sets[j].weight;
      const after = exercises.findIndex((x, n) => n > i && firstOpen(x) >= 0);
      return {
        title: `Set ${j + 1} · ${w != null ? `${toDisplay(w, unit)} ${unit} × ` : ''}${range}`,
        sub:
          after >= 0
            ? `Then ${p.liftFor(after, exercises[after].exerciseId).name}, ${exercises[after].sets.length} sets`
            : 'Last exercise of the day',
      };
    })();
    const finishedExercise = firstOpen(logged) < 0;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
        <TopBar {...p} index={i} />
        <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
          <Text style={label}>Rest</Text>
          <Text style={{ color: colors.muted, fontSize: 16, marginTop: 6 }}>
            Set {lastLogged.j + 1} logged · {loggedSet.weight != null ? `${toDisplay(loggedSet.weight, unit)} ${unit} × ` : ''}
            {loggedSet.reps} ✓
          </Text>
          <RestRing rest={p.rest} onDone={p.stopRest} />
          {finishedExercise && settings.painCheck !== false && (
            <PainCheck
              ex={logged}
              name={p.liftFor(lastLogged.i, logged.exerciseId).name}
              areas={p.painAreas}
              onChange={(c) => p.changeExercise(lastLogged.i, c)}
            />
          )}
          {upNext && (
            <View style={[card, { alignSelf: 'stretch', padding: 16, marginTop: 20 }]}>
              <Text style={[label, { fontSize: 12 }]}>Up next</Text>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 4 }}>{upNext.title}</Text>
              <Text style={{ color: colors.muted, fontSize: 14, marginTop: 3 }}>{upNext.sub}</Text>
            </View>
          )}
        </ScrollView>
        <View style={{ paddingHorizontal: 22, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <SoftButton label="−15 s" onPress={() => adjustRest(p, -15)} />
            <SoftButton label="+15 s" onPress={() => adjustRest(p, 15)} />
          </View>
          <BigButton label="Skip rest" onPress={p.stopRest} />
        </View>
      </SafeAreaView>
    );
  }

  // ---- All sets done ----
  if (allDone) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
        <TopBar {...p} index={exercises.length} />
        <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
          <Text style={label}>All sets done</Text>
          <Text style={big}>Nice work.</Text>
          <Text style={{ color: colors.muted, fontSize: 16, marginTop: 8 }}>Finish to save it and see how your week looks.</Text>
          {settings.painCheck !== false && <PainCheck ex={ex} name={e.name} areas={p.painAreas} onChange={(c) => p.changeExercise(i, c)} />}
        </View>
        <View style={{ paddingHorizontal: 22, paddingBottom: 8 }}>
          <BigButton label="Finish workout" onPress={p.finish} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
            <LinkText label="‹ Previous" onPress={() => setIndex(exercises.length - 1)} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ---- Logging a set ----
  const muscles = [e.primary, ...e.secondary.slice(0, 2)].map((m) => MUSCLE_NAMES[m]).join(' · ');
  const before = lastTime(ex.exerciseId, sorted, unit);
  const nextOpen = exercises.findIndex((x, k) => k !== i && firstOpen(x) >= 0);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <TopBar {...p} index={i} />
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 26, paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <Text style={label}>
            Exercise {i + 1} of {exercises.length}
            {catchUp > 0 ? ` · +${catchUp} catch-up set${catchUp > 1 ? 's' : ''}` : ''}
          </Text>
          <Text style={big}>{e.name}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.muted, fontSize: 15, flex: 1 }}>{muscles}</Text>
            <LinkText label="Swap" onPress={() => p.swap(i)} accent />
          </View>

          {set ? (
            <View style={[card, { marginTop: 22, paddingVertical: 20, paddingHorizontal: 16 }]}>
              <Text style={{ color: colors.muted, fontSize: 15, fontWeight: '700', textAlign: 'center' }}>
                Set {j + 1} of {ex.sets.length} · aim for {e.repMin === e.repMax ? e.repMin : `${e.repMin}–${e.repMax}`} reps
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
                <BigNumber
                  value={set.weight == null ? '' : toDisplay(set.weight, unit)}
                  caption={unit}
                  decimal
                  onText={(t) => p.changeSet(i, j, { weight: fromDisplay(t, unit) })}
                  onStep={(d) => p.changeSet(i, j, { weight: Math.max(0, Math.round(((set.weight ?? 0) + d * step) * 10) / 10) })}
                />
                <BigNumber
                  value={String(reps)}
                  caption="reps"
                  onText={(t) => p.changeSet(i, j, { reps: t ? parseInt(t, 10) || 0 : null })}
                  onStep={(d) => p.changeSet(i, j, { reps: Math.max(0, reps + d) })}
                />
              </View>
              {before && (
                <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 16 }}>
                  Last time: <Text style={{ color: colors.text, fontWeight: '700' }}>{before}</Text>
                </Text>
              )}
            </View>
          ) : (
            <Text style={{ color: colors.muted, fontSize: 16, marginTop: 22, textAlign: 'center' }}>All sets done for this exercise.</Text>
          )}

          {/* One dot per set: filled when done, gold ring for this one, dashed for catch-up */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 20 }}>
            {ex.sets.map((s, k) => (
              <View
                key={k}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  borderWidth: 2,
                  borderStyle: isCatchUp(k) && !s.done ? 'dashed' : 'solid',
                  borderColor: s.done ? colors.text : k === j || isCatchUp(k) ? colors.gold : colors.border,
                  backgroundColor: s.done ? colors.text : k === j ? colors.accentSoft : 'transparent',
                }}
              />
            ))}
          </View>
          {catchUp > 0 && (
            <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 10 }}>Dashed set = catching up on this week</Text>
          )}

          {set && (
            <View style={{ alignItems: 'center', marginTop: 18 }}>
              <Text style={{ color: colors.muted, fontSize: 14, marginBottom: 8 }}>
                Reps left in the tank (aim {plan?.rirTarget ?? '1-2'}). Optional.
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {RIR_CHOICES.map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => p.changeSet(i, j, { rir: set.rir === r ? null : r })}
                    style={{
                      width: 42,
                      height: 36,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: set.rir === r ? colors.accent : colors.chip,
                    }}>
                    <Text style={{ color: set.rir === r ? colors.onAccent : colors.text, fontWeight: '700' }}>{r === 4 ? '4+' : r}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
        <View style={{ paddingHorizontal: 22, paddingBottom: 8 }}>
          {set ? (
            <BigButton label={set.weight == null ? 'Enter a weight first' : '✓  Done with set'} onPress={done} disabled={set.weight == null} />
          ) : (
            <BigButton label="Next exercise ›" onPress={() => setIndex(nextOpen >= 0 ? nextOpen : i)} />
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
            {i > 0 ? <LinkText label="‹ Previous" onPress={() => setIndex(i - 1)} /> : <View />}
            {i < exercises.length - 1 ? <LinkText label="Skip exercise ›" onPress={() => setIndex(i + 1)} /> : <View />}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function adjustRest(p: Props, by: number) {
  if (!p.rest) return;
  p.changeRest({ ...p.rest, endAt: Math.max(Date.now(), p.rest.endAt + by * 1000), total: Math.max(15, p.rest.total + by) });
}

function TopBar(p: Props & { index: number }) {
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 8 }}>
        <RoundButton label="✕" onPress={p.leave} />
        <Text style={{ color: colors.muted, fontSize: 14, fontWeight: '600' }}>
          {p.dayName} · {p.timeLeft.replace(/^About/, 'about')}
        </Text>
        <RoundButton label="≡" onPress={p.showList} />
      </View>
      <View style={{ flexDirection: 'row', gap: 5, paddingHorizontal: 22, paddingTop: 12 }}>
        {p.exercises.map((x, k) => (
          <View
            key={k}
            style={{
              flex: 1,
              height: 5,
              borderRadius: 3,
              backgroundColor: firstOpen(x) < 0 ? colors.text : k === p.index ? colors.gold : colors.border,
            }}
          />
        ))}
      </View>
    </View>
  );
}

function RestRing({ rest, onDone }: { rest: Rest; onDone: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const left = (rest.endAt - now) / 1000;
  const finished = left <= 0;
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!finished) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const id = setTimeout(onDone, 4000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);
  const r = 104;
  const around = 2 * Math.PI * r;
  const progress = Math.min(1, Math.max(0, left / rest.total));
  return (
    <View style={{ width: 240, height: 240, marginTop: 26, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={240} height={240} style={{ position: 'absolute' }}>
        <Circle cx={120} cy={120} r={r} fill="none" stroke={colors.border} strokeWidth={14} />
        <Circle
          cx={120}
          cy={120}
          r={r}
          fill="none"
          stroke={colors.gold}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={`${around}`}
          strokeDashoffset={around * (1 - progress)}
          transform="rotate(-90 120 120)"
        />
      </Svg>
      <Text
        style={{ color: finished ? colors.good : colors.text, fontSize: 60, fontWeight: '900', letterSpacing: -2, fontVariant: ['tabular-nums'] }}>
        {finished ? 'Go' : formatClock(left)}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 14, fontWeight: '600' }}>of {formatClock(rest.total)}</Text>
    </View>
  );
}

function PainCheck({
  ex,
  name,
  areas,
  onChange,
}: {
  ex: LoggedExercise;
  name: string;
  areas: string[];
  onChange: (c: (x: LoggedExercise) => LoggedExercise) => void;
}) {
  return (
    <View style={{ alignSelf: 'stretch', marginTop: 20 }}>
      <Text style={{ color: colors.muted, fontSize: 14, marginBottom: 8 }}>Any joint or muscle pain on {name}? Optional (10 = worst).</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {Array.from({ length: 11 }, (_, n) => (
          <Pressable
            key={n}
            onPress={() => onChange((x) => ({ ...x, pain: n, painArea: n > 0 ? x.painArea : null }))}
            style={{
              width: 34,
              height: 32,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: ex.pain === n ? (n >= 5 ? colors.danger : n >= 3 ? colors.warn : colors.good) : colors.chip,
            }}>
            <Text style={{ color: ex.pain === n ? (n >= 3 ? '#FFFFFF' : colors.onAccent) : colors.text, fontWeight: '600' }}>{n}</Text>
          </Pressable>
        ))}
      </View>
      {!!ex.pain && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {areas.map((a) => (
            <Pressable
              key={a}
              onPress={() => onChange((x) => ({ ...x, painArea: x.painArea === a ? null : a }))}
              style={{
                borderRadius: 16,
                paddingVertical: 7,
                paddingHorizontal: 13,
                backgroundColor: ex.painArea === a ? colors.accent : colors.chip,
              }}>
              <Text style={{ color: ex.painArea === a ? colors.onAccent : colors.text, fontWeight: '600' }}>{a}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function BigNumber({
  value,
  caption,
  decimal,
  onText,
  onStep,
}: {
  value: string;
  caption: string;
  decimal?: boolean;
  onText: (t: string) => void;
  onStep: (d: number) => void;
}) {
  const [text, setText] = useState(value);
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    if (text !== value) setText(value);
  }
  return (
    <View style={{ alignItems: 'center', minWidth: 140 }}>
      <TextInput
        value={text}
        onChangeText={(t) => {
          const clean = decimal ? t.replace(',', '.').replace(/[^0-9.]/g, '') : t.replace(/[^0-9]/g, '');
          setText(clean);
          onText(clean);
        }}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        placeholder="—"
        placeholderTextColor={colors.placeholder}
        selectTextOnFocus
        style={{ color: colors.text, fontSize: 60, fontWeight: '900', letterSpacing: -2, textAlign: 'center', minWidth: 120, padding: 0 }}
      />
      <Text style={{ color: colors.muted, fontSize: 14, fontWeight: '600' }}>{caption}</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <SmallStep label="−" onPress={() => onStep(-1)} />
        <SmallStep label="+" onPress={() => onStep(1)} />
      </View>
    </View>
  );
}

function SmallStep({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 48,
        height: 38,
        borderRadius: 12,
        backgroundColor: colors.chip,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
}

function RoundButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

function BigButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        marginTop: 10,
        backgroundColor: disabled ? colors.chip : colors.accent,
        borderRadius: 20,
        paddingVertical: 20,
        alignItems: 'center',
        opacity: pressed ? 0.8 : 1,
      })}>
      <Text style={{ color: disabled ? colors.muted : colors.onAccent, fontSize: 20, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
}

function SoftButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, backgroundColor: colors.chip, borderRadius: 18, paddingVertical: 17, alignItems: 'center' }}>
      <Text style={{ color: colors.text, fontWeight: '800', fontSize: 17 }}>{label}</Text>
    </Pressable>
  );
}

function LinkText({ label, onPress, accent }: { label: string; onPress: () => void; accent?: boolean }) {
  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <Text style={{ color: accent ? colors.accent : colors.muted, fontSize: 15, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

const label = { color: colors.gold, fontSize: 13, fontWeight: '800' as const, letterSpacing: 1.4, textTransform: 'uppercase' as const };
const big = { color: colors.text, fontSize: 38, lineHeight: 41, fontWeight: '900' as const, letterSpacing: -1.2, marginTop: 8, marginBottom: 8 };
const card = { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 26 };
