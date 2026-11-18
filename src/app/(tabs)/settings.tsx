import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppVersion from '../../components/AppVersion';
import { router, useFocusEffect } from 'expo-router';
import { Button, Card, Chip, Muted, styles, Title } from '../../components/ui';
import { day } from '../../engine/exercises';
import { blockWeek, isDeload, rotationFor } from '../../engine/plan';
import { daysFor, goalFor, goalInfo, programFor } from '../../engine/programs';
import { defaultRest, formatClock, REST_GROUPS, REST_MAX, REST_MIN, restFor } from '../../engine/rest';
import { colors } from '../../theme';
import { RestGroup, Settings } from '../../engine/types';
import { loadSettings, updateSettings } from '../../storage';
import { pickBackup, shareBackup } from '../../backup';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<Settings | null>(null);
  useFocusEffect(
    useCallback(() => {
      loadSettings().then(setSettings);
    }, [])
  );
  if (!settings) return null;

  const change = async (c: Partial<Settings>) => setSettings(await updateSettings(c));
  const now = new Date();
  const deload = isDeload(settings, now);
  const swaps = Object.entries(settings.swaps);
  const goal = goalFor(settings);

  // Rest in 15 second steps; landing back on the default clears the custom time
  function stepRest(group: RestGroup, by: number) {
    const next = Math.min(REST_MAX, Math.max(REST_MIN, restFor(group, goal, settings!.rest) + by));
    const rest = { ...settings!.rest };
    if (next === defaultRest(group, goal)) delete rest[group];
    else rest[group] = next;
    change({ rest });
  }

  async function saveBackup() {
    try {
      await shareBackup();
    } catch {
      Alert.alert("Couldn't save a backup", 'Something went wrong making the file. Try again.');
    }
  }

  async function restoreBackup() {
    let picked;
    try {
      picked = await pickBackup();
    } catch {
      Alert.alert("Couldn't open that file", 'Try picking it again.');
      return;
    }
    if (!picked) return;
    if ('error' in picked) {
      Alert.alert("Couldn't restore", picked.error);
      return;
    }
    const { backup, apply } = picked;
    const when = new Date(backup.exportedAt).toLocaleDateString();
    Alert.alert(
      'Replace everything on this phone?',
      `This backup from ${when} has ${backup.sessions.length} ${backup.sessions.length === 1 ? 'workout' : 'workouts'}. It replaces all workouts and settings on this phone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            await apply();
            setSettings(await loadSettings());
            Alert.alert('Restored', 'Your workouts and settings are back.');
          },
        },
      ]
    );
  }

  const rotation = rotationFor(settings);
  function move(i: number, by: number) {
    const j = i + by;
    if (j < 0 || j >= rotation.length) return;
    const next = [...rotation];
    [next[i], next[j]] = [next[j], next[i]];
    change({ rotation: next });
  }


  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.screen}>
        <Title>Settings</Title>

        <Card>
          <Text style={styles.h2}>Cut or build</Text>
          <Muted style={{ marginVertical: 8 }}>
            Cut keeps the weights heavy with moderate volume, which is enough to hold on to muscle while you lose fat. Build
            raises the weekly targets.
          </Muted>
          <View style={{ flexDirection: 'row' }}>
            <Chip label="Cut" selected={settings.mode === 'cut'} onPress={() => change({ mode: 'cut' })} />
            <Chip label="Build" selected={settings.mode === 'build'} onPress={() => change({ mode: 'build' })} />
          </View>
        </Card>

        <Card>
          <Text style={styles.h2}>Units</Text>
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <Chip label="lb" selected={settings.unit === 'lb'} onPress={() => change({ unit: 'lb' })} />
            <Chip label="kg" selected={settings.unit === 'kg'} onPress={() => change({ unit: 'kg' })} />
          </View>
        </Card>

        <Card>
          <Text style={styles.h2}>Pain check</Text>
          <Muted style={{ marginVertical: 8 }}>
            After each exercise, rate any joint or muscle pain from 0 to 10. 3 or more holds the weight, 5 or more drops it about 10% and
            suggests a swap. Skipping a rating counts as no pain.
          </Muted>
          <View style={{ flexDirection: 'row' }}>
            <Chip label="On" selected={settings.painCheck !== false} onPress={() => change({ painCheck: true })} />
            <Chip label="Off" selected={settings.painCheck === false} onPress={() => change({ painCheck: false })} />
          </View>
        </Card>

        <Card>
          <Text style={styles.h2}>Rest between sets</Text>
          <Muted style={{ marginVertical: 8 }}>
            {goal === 'endurance'
              ? 'For endurance the defaults are short on purpose: training while partly tired builds the ability to keep going.'
              : 'Longer rest on big lifts lets you keep your reps up, which builds more muscle and strength than short rest. Past about 90 seconds, extra rest helps isolation work little.'}{' '}
            The timer still adds 30 seconds after a set to failure and a minute on a lift that has stalled, and takes 30 off on a deload week.
          </Muted>
          {REST_GROUPS.map(({ group, name, detail }) => {
            const value = restFor(group, goal, settings.rest);
            const custom = settings.rest?.[group] != null;
            return (
              <View key={group} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderColor: colors.border }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.body, { fontWeight: '700' }]}>{name}</Text>
                  <Muted style={{ fontSize: 12 }}>
                    {detail} · {custom ? `default ${formatClock(defaultRest(group, goal))}` : 'default'}
                  </Muted>
                </View>
                <StepButton label="−" onPress={() => stepRest(group, -15)} />
                <Text style={{ color: custom ? colors.goldText : colors.text, fontWeight: '800', fontSize: 17, width: 52, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
                  {formatClock(value)}
                </Text>
                <StepButton label="+" onPress={() => stepRest(group, 15)} />
              </View>
            );
          })}
          {settings.rest && Object.keys(settings.rest).length > 0 && (
            <Button title="Back to the defaults" kind="plain" onPress={() => change({ rest: {} })} />
          )}
        </Card>

        <Card>
          <Text style={styles.h2}>Training block</Text>
          <Text style={[styles.body, { marginTop: 8 }]}>
            {programFor(settings).name} · {goalInfo(goalFor(settings)).name} · {daysFor(settings)} days a week
          </Text>
          <Muted style={{ marginVertical: 8 }}>
            {deload
              ? 'Deload week in progress. A new block starts when it ends.'
              : `Week ${blockWeek(settings, now) + 1}, started ${new Date(settings.blockStart).toLocaleDateString()}. Volume builds for 4 weeks, then holds. The app suggests a deload when your lifts stall.`}
          </Muted>
          <View style={{ gap: 8 }}>
            {deload ? (
              <Button title="End deload now" kind="plain" onPress={() => change({ deloadStart: null, lastDeloadEnd: new Date().toISOString(), blockStart: new Date().toISOString() })} />
            ) : (
              <Button title="Start deload week" kind="plain" onPress={() => change({ deloadStart: new Date().toISOString() })} />
            )}
            <Button title="Start a new block" kind="plain" onPress={() => router.push('/new-block')} />
          </View>
        </Card>

        <Card>
          <Text style={styles.h2}>Rotation order</Text>
          <Muted style={{ marginVertical: 8 }}>The order your days come up in. The app always shows the next one, whatever day of the week it is.</Muted>
          {rotation.map((id, i) => (
            <View key={id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
              <Text style={[styles.body, { width: 24, color: colors.muted }]}>{i + 1}</Text>
              <Text style={[styles.body, { flex: 1 }]}>{day(id).name}</Text>
              <Text style={[arrow, i === 0 && { opacity: 0.25 }]} onPress={() => move(i, -1)} suppressHighlighting>
                ↑
              </Text>
              <Text style={[arrow, i === rotation.length - 1 && { opacity: 0.25 }]} onPress={() => move(i, 1)} suppressHighlighting>
                ↓
              </Text>
            </View>
          ))}
          {settings.rotation && (
            <Text style={{ color: colors.accent, fontWeight: '600', marginTop: 6 }} onPress={() => change({ rotation: undefined })}>
              Back to the original order
            </Text>
          )}
        </Card>

        <Card>
          <Text style={styles.h2}>Exercises and machines</Text>
          <Muted style={{ marginVertical: 8 }}>
            {swaps.length === 0
              ? 'Using the original exercises.'
              : `${swaps.length} ${swaps.length === 1 ? 'exercise' : 'exercises'} replaced.`}{' '}
            Replace any exercise, or add a machine your gym has.
          </Muted>
          <Button title="Change exercises" kind="plain" onPress={() => router.push('/program')} />
        </Card>

        <Card>
          <Text style={styles.h2}>Backup</Text>
          <Muted style={{ marginVertical: 8 }}>
            Everything is stored only on this phone. Save a backup to Files or iCloud Drive now and then, so a lost or new phone doesn&apos;t
            mean starting over.
          </Muted>
          <View style={{ gap: 8 }}>
            <Button title="Save a backup" kind="plain" onPress={saveBackup} />
            <Button title="Restore from a backup" kind="plain" onPress={restoreBackup} />
          </View>
        </Card>

        <View style={{ gap: 8 }}>
          <Button title="1 rep max calculator" kind="plain" onPress={() => router.push('/one-rm')} />
          <Button title="Why this works" kind="plain" onPress={() => router.push('/science')} />
        </View>
        <AppVersion />
      </ScrollView>
    </SafeAreaView>
  );
}

const arrow = { color: colors.accent, fontSize: 20, fontWeight: '700' as const, paddingHorizontal: 12, paddingVertical: 2 };

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({ width: 38, height: 34, borderRadius: 10, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
}
