import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, Chip, Muted, styles } from '../components/ui';
import { DAY_CHOICES, DAYS_GUIDANCE, daysFor, goalFor, goalInfo, GOALS, programFor, suggestPrograms } from '../engine/programs';
import { Goal, Mode, Settings } from '../engine/types';
import { loadSettings, updateSettings } from '../storage';
import { colors } from '../theme';

// ------------------------------------------------------------------
// Start a new block: two questions (goal, days a week), then the
// programs that fit. Starting it resets the 4-week volume ramp.
// The first time the app opens, the same screen is the setup, with three
// more choices (cut or build, units, pain check).
// ------------------------------------------------------------------

export default function NewBlockScreen() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [goal, setGoal] = useState<Goal>('hypertrophy');
  const [days, setDays] = useState(5);
  const [picked, setPicked] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const first = useLocalSearchParams<{ first?: string }>().first === '1';
  const [mode, setMode] = useState<Mode>('build');
  const [unit, setUnit] = useState<Settings['unit']>('lb');
  const [painCheck, setPainCheck] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadSettings().then((s) => {
        setSettings(s);
        setGoal(goalFor(s));
        setDays(daysFor(s));
        setPicked(programFor(s).id);
        setMode(s.mode);
        setUnit(s.unit);
        setPainCheck(s.painCheck !== false);
      });
    }, [])
  );
  if (!settings) return null;

  const fits = suggestPrograms(goal, days);
  const good = fits.filter((f) => f.fit !== 'other');
  const others = fits.filter((f) => f.fit === 'other');
  // Keep the pick if it still fits, otherwise move to the best fit
  const choose = (g: Goal, d: number) => {
    setGoal(g);
    setDays(d);
    const next = suggestPrograms(g, d);
    if (!next.some((f) => f.fit !== 'other' && f.program.id === picked)) setPicked(next[0].program.id);
  };
  const current = programFor(settings).id;

  async function start() {
    const now = new Date().toISOString();
    await updateSettings({
      goal,
      daysPerWeek: days,
      program: picked ?? fits[0].program.id,
      // A different program starts from its own order and first day
      ...(picked !== current ? { rotation: undefined, nextDayOverride: null } : {}),
      blockStart: now,
      deloadStart: null,
      ...(first ? { mode, unit, painCheck, setupDone: true } : {}),
    });
    if (first) router.replace('/');
    else router.back();
  }

  const row = (f: (typeof fits)[number]) => {
    const p = f.program;
    const selected = p.id === picked;
    return (
      <Pressable key={p.id} onPress={() => setPicked(p.id)}>
        <Card style={{ borderWidth: 2, borderColor: selected ? colors.accent : 'transparent' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={[styles.h2, { flex: 1 }]}>{p.name}</Text>
            {f.fit === 'best' && <Badge label="Best fit" />}
            {f.fit !== 'best' && p.id === current && <Badge label="Current" />}
          </View>
          <Muted>
            {p.short} · {p.fits[0] === p.fits[1] ? p.fits[0] : `${p.fits[0]}-${p.fits[1]}`} days
          </Muted>
          {selected && <Text style={[styles.body, { marginTop: 8 }]}>{p.guidance}</Text>}
        </Card>
      </Pressable>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      {first ? (
        <>
          <Stack.Screen options={{ title: 'Welcome', headerBackVisible: false, gestureEnabled: false }} />
          <Text style={[styles.h2, { marginBottom: 6 }]}>Miss a day, keep your progress.</Text>
          <Text style={[styles.body, { marginBottom: 14 }]}>
            Every Set Counts plans every workout around one thing: getting your weekly sets in for every muscle. Miss a day and the next sessions
            catch you up. Answer a few questions to set it up. You can change any of it later in Settings.
          </Text>
        </>
      ) : (
        <Muted style={{ marginBottom: 14 }}>
          Two quick questions. A block runs about 4 to 6 weeks: weekly sets build for 4 weeks, then the app suggests a lighter week
          when your lifts stall. Cut or build stays as it is.
        </Muted>
      )}

      <Card>
        <Text style={styles.h2}>{"What's the goal?"}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
          {GOALS.map((g) => (
            <Chip key={g.id} label={g.name} selected={goal === g.id} onPress={() => choose(g.id, days)} />
          ))}
        </View>
        <Muted>{goalInfo(goal).short}</Muted>
      </Card>

      <Card>
        <Text style={styles.h2}>How many days a week will you lift?</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
          {DAY_CHOICES.map((d) => (
            <Chip key={d} label={String(d)} selected={days === d} onPress={() => choose(goal, d)} />
          ))}
        </View>
        <Muted>{DAYS_GUIDANCE}</Muted>
      </Card>

      {first && (
        <>
          <Card>
            <Text style={styles.h2}>Trying to lose fat right now?</Text>
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <Chip label="No, build" selected={mode === 'build'} onPress={() => setMode('build')} />
              <Chip label="Yes, cut" selected={mode === 'cut'} onPress={() => setMode('cut')} />
            </View>
            <Muted>A cut keeps the weights heavy with a bit less volume, enough to hold on to muscle while you lose fat.</Muted>
          </Card>

          <Card>
            <Text style={styles.h2}>Pounds or kilos?</Text>
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <Chip label="lb" selected={unit === 'lb'} onPress={() => setUnit('lb')} />
              <Chip label="kg" selected={unit === 'kg'} onPress={() => setUnit('kg')} />
            </View>
          </Card>

          <Card>
            <Text style={styles.h2}>Ask about aches and pains?</Text>
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <Chip label="Yes" selected={painCheck} onPress={() => setPainCheck(true)} />
              <Chip label="No" selected={!painCheck} onPress={() => setPainCheck(false)} />
            </View>
            <Muted>
              After each exercise you can rate any joint or muscle pain from 0 to 10. If something hurts, the weight holds or drops instead
              of going up.
            </Muted>
          </Card>
        </>
      )}

      <Text style={[styles.h2, { marginTop: 8, marginBottom: 10 }]}>{first ? 'Pick a program' : 'Programs that fit'}</Text>
      {good.map(row)}
      {others.length > 0 &&
        (showAll || others.some((f) => f.program.id === picked) ? (
          <>
            <Muted style={{ marginBottom: 10 }}>{"These don't fit your goal or days as well, but you can still pick one."}</Muted>
            {others.map(row)}
          </>
        ) : (
          <Text style={{ color: colors.accent, fontWeight: '600', marginBottom: 16 }} onPress={() => setShowAll(true)}>
            Show all programs
          </Text>
        ))}

      <Card style={{ backgroundColor: colors.accentSoft }}>
        <Text style={styles.body}>{goalInfo(goal).guidance}</Text>
      </Card>

      <Button title={first ? "Let's go" : 'Start this block'} onPress={start} />
    </ScrollView>
  );
}
