import { useCallback, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Button, Card, Chip, Muted, styles } from '../components/ui';
import { exercise } from '../engine/exercises';
import { isDeload } from '../engine/plan';
import { Session, Settings } from '../engine/types';
import { cycleFor, LIGHT_WEEK, PlannedSet, planWave, trainingMaxFrom1RM, waveLifts } from '../engine/wave';
import { fromDisplay, loadSessions, loadSettings, toDisplay, updateSettings } from '../storage';
import { colors } from '../theme';

// ------------------------------------------------------------------
// Training maxes for the wave programs (Strength Waves, Strength + Size). Type a
// 1 rep max or a training max for each main lift, and see every set of
// the 4-week cycle worked out from it. Leave a lift blank to keep the
// training max it has now.
// ------------------------------------------------------------------

type Entry = '1rm' | 'tm';

export default function TrainingMaxScreen() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [entry, setEntry] = useState<Entry>('1rm');
  const [typed, setTyped] = useState<Record<string, string>>({});

  useFocusEffect(
    useCallback(() => {
      Promise.all([loadSettings(), loadSessions()]).then(([s, all]) => {
        setSettings(s);
        setSessions(all);
      });
    }, [])
  );
  if (!settings) return null;
  const unit = settings.unit;
  const show = (lb: number | null) => (lb == null ? '—' : toDisplay(lb, unit));
  const deload = isDeload(settings, new Date());

  // The training max a typed number gives, in lb
  function fromTyped(id: string): number | null {
    const v = fromDisplay(typed[id] ?? '', unit);
    if (v == null || v <= 0) return null;
    return entry === '1rm' ? trainingMaxFrom1RM(v) : Math.round(v * 10) / 10;
  }

  const lifts = waveLifts(settings).map((l) => {
    const now = planWave('main', l.exerciseId, l.dayId, sessions, settings, deload);
    const fresh = fromTyped(l.exerciseId);
    return { ...l, week: now.week, current: now.trainingMax, fresh, tm: fresh ?? now.trainingMax };
  });
  const changed = lifts.filter((l) => l.fresh != null);

  async function save() {
    const setAt = new Date().toISOString();
    const trainingMaxes = { ...settings!.trainingMaxes };
    for (const l of changed) trainingMaxes[l.exerciseId] = { lb: l.fresh!, setAt };
    setSettings(await updateSettings({ trainingMaxes }));
    setTyped({});
    if (router.canGoBack()) router.back();
  }

  const setLine = (sets: PlannedSet[]) => sets.map((x) => `${x.reps}${x.asMany ? '+' : ''} × ${show(x.weight)}`).join('   ');

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <Muted style={{ marginBottom: 14 }}>
        Enter a number for each main lift and the app works out every set of the 4-week cycle. Your training max is 90% of your 1 rep max, so
        the heavy sets start a little easy. After each cycle it goes up on its own when your last sets make their reps.
      </Muted>

      <Card>
        <Text style={styles.h2}>What are you entering?</Text>
        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          <Chip label="1 rep max" selected={entry === '1rm'} onPress={() => setEntry('1rm')} />
          <Chip label="Training max" selected={entry === 'tm'} onPress={() => setEntry('tm')} />
        </View>
        <Muted>
          {entry === '1rm'
            ? 'The most you can lift once, or a recent estimate from the 1 rep max calculator. The app takes 90% of it.'
            : 'Already have a training max? Enter it as is.'}
        </Muted>
      </Card>

      {lifts.map((l) => {
        const e = exercise(l.exerciseId);
        const cycle = l.tm != null ? cycleFor(l.tm, l.after) : null;
        return (
          <Card key={l.dayId}>
            <Text style={styles.h2}>{e.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
              <TextInput
                style={field}
                keyboardType="decimal-pad"
                value={typed[l.exerciseId] ?? ''}
                onChangeText={(t) => setTyped((x) => ({ ...x, [l.exerciseId]: t }))}
                placeholder={entry === '1rm' ? '1 rep max' : l.current != null ? show(l.current) : 'Training max'}
                placeholderTextColor={colors.placeholder}
                accessibilityLabel={`${e.name} ${entry === '1rm' ? '1 rep max' : 'training max'} in ${unit}`}
              />
              <Text style={[styles.body, { marginLeft: 8, color: colors.muted }]}>{unit}</Text>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Muted style={{ fontSize: 12 }}>Training max</Muted>
                <Text style={{ color: l.fresh != null ? colors.goldText : colors.text, fontWeight: '800', fontSize: 18 }}>
                  {l.tm != null ? `${show(l.tm)} ${unit}` : 'Not set'}
                </Text>
              </View>
            </View>
            {l.fresh != null && l.current != null && <Muted style={{ marginTop: 4 }}>Was {show(l.current)} {unit}. Saving replaces it.</Muted>}

            {cycle ? (
              <View style={{ marginTop: 12 }}>
                {cycle.map((w) => {
                  const now = w.week === l.week;
                  return (
                    <View
                      key={w.week}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 10,
                        marginHorizontal: -10,
                        borderRadius: 10,
                        backgroundColor: now ? colors.accentSoft : 'transparent',
                      }}>
                      <Text style={[styles.body, { fontWeight: '700' }]}>
                        Week {w.week + 1}: {w.name}
                        {now ? ' · next up' : ''}
                      </Text>
                      <Text style={[styles.body, { fontVariant: ['tabular-nums'], marginTop: 2 }]}>{setLine(w.sets)}</Text>
                      <Muted style={{ fontSize: 13 }}>
                        {w.after
                          ? `Then ${w.after.sets} × ${w.after.reps} at ${show(w.after.weight)} ${unit}`
                          : w.week === LIGHT_WEEK
                            ? 'Light week, nothing after'
                            : ''}
                      </Muted>
                    </View>
                  );
                })}
                <Muted style={{ fontSize: 12, marginTop: 4 }}>
                  Reps × {unit}. + means as many good reps as you can, stopping 1 short of failure.
                </Muted>
              </View>
            ) : (
              <Muted style={{ marginTop: 8 }}>Enter a number to see the whole cycle, or log your first session and the app sets it.</Muted>
            )}
          </Card>
        );
      })}

      {lifts.length === 0 && (
        <Card>
          <Muted>Training maxes are for Strength Waves and Strength + Size. Pick one of them when you start a new block.</Muted>
        </Card>
      )}

      {lifts.length > 0 && (
        <Button
          title={changed.length ? `Save ${changed.length === 1 ? '1 training max' : `${changed.length} training maxes`}` : 'Enter a number to save'}
          onPress={save}
          disabled={!changed.length}
        />
      )}
    </ScrollView>
  );
}

const field = {
  backgroundColor: colors.field,
  color: colors.text,
  borderRadius: 10,
  paddingVertical: 10,
  paddingHorizontal: 12,
  fontSize: 18,
  width: 120,
};
