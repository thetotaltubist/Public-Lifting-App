import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Badge, Card, Muted, styles, Title } from '../../components/ui';
import MuscleRing from '../../components/MuscleRing';
import { MUSCLE_NAMES } from '../../engine/exercises';
import { blockWeek, isDeload } from '../../engine/plan';
import { daysFor } from '../../engine/programs';
import { weeklyRecap } from '../../engine/recap';
import { Muscle, Session, Settings } from '../../engine/types';
import { rollingVolume, TARGETS, targetFor } from '../../engine/volume';
import { loadSessions, loadSettings } from '../../storage';
import { colors } from '../../theme';

export default function VolumeScreen() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([loadSessions(), loadSettings()]).then(([all, s]) => {
        setSessions(all);
        setSettings(s);
      });
    }, [])
  );

  if (!settings) return null;
  const now = new Date();
  const done = rollingVolume(sessions, now);
  const week = blockWeek(settings, now);
  const deload = isDeload(settings, now);
  const muscles = Object.keys(TARGETS[settings.mode]) as Muscle[];
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  const recap = weeklyRecap(sessions, settings, now);
  const rows = muscles.map((m) => ({ m, target: targetFor(m, settings, week, deload), have: done[m] ?? 0 }));
  const totalTarget = rows.reduce((t, r) => t + r.target, 0);
  const totalDone = rows.reduce((t, r) => t + Math.min(r.have, r.target), 0);
  const percent = totalTarget ? Math.round((totalDone / totalTarget) * 100) : 0;
  const owed = rows.filter((r) => r.target - r.have >= 1).map((r) => `${Math.floor(r.target - r.have)} ${MUSCLE_NAMES[r.m].toLowerCase()}`);
  const day = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.screen}>
        <Title>Your week</Title>
        <Muted style={{ marginBottom: 14 }}>Last 7 days · {daysFor(settings)} workouts planned</Muted>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <View>
              <Text style={[styles.title, { fontSize: 36, marginBottom: 0 }]}>{percent}%</Text>
              <Muted>of this week&apos;s sets done</Muted>
            </View>
            {percent >= 100 ? <Badge tone="gold" label="All done" /> : <Badge tone="gold" label="Rolling 7 days" />}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {rows.map((r) => (
              <MuscleRing key={r.m} label={MUSCLE_NAMES[r.m]} have={Math.round(r.have * 2) / 2} target={r.target} />
            ))}
          </View>
          <Muted>
            Helper muscles count as half a set (presses count toward triceps, for example), so these are close estimates. Front delts
            have no target of their own because presses already cover them.
          </Muted>
        </Card>
        <Card>
          <Text style={styles.body}>
            <Text style={{ fontWeight: '700' }}>{owed.length ? 'Still owed: ' : 'Nothing owed. '}</Text>
            {owed.length
              ? `${owed.join(', ')}. Your next workouts add catch-up sets to pick them up.`
              : 'Every muscle has its sets for the last 7 days.'}
          </Text>
        </Card>
        {recap.length > 0 && (
          <Card>
            <Text style={styles.h2}>Weekly recap</Text>
            <Muted style={{ marginTop: 4, marginBottom: 6 }}>
              Finished weeks, counted from the day your block started. Tap a week to see what was short.
            </Muted>
            {recap.map((w, i) => {
              const allHit = w.hit === w.total;
              const tone = allHit ? colors.good : colors.goldText;
              const short = w.rows.filter((r) => r.target > 0 && r.have < r.target);
              const last = new Date(w.end.getTime() - 1);
              return (
                <Pressable key={w.start.toISOString()} onPress={() => setOpen(open === i ? null : i)} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: colors.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.body}>
                        {day(w.start)} – {day(last)}
                        {w.deload ? ' · deload' : ''}
                      </Text>
                      <Muted>
                        {w.workouts} {w.workouts === 1 ? 'workout' : 'workouts'}
                      </Muted>
                    </View>
                    <Text style={[styles.body, { fontWeight: '700', color: tone }]}>
                      {w.workouts ? (allHit ? 'All goals hit' : `${w.hit} of ${w.total} hit`) : 'No workouts'}
                    </Text>
                  </View>
                  {open === i && w.workouts > 0 && (
                    <View style={{ marginTop: 6 }}>
                      {short.length === 0 && <Muted>Every muscle reached its target this week.</Muted>}
                      {short.map((r) => (
                        <View key={r.muscle} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                          <Text style={[styles.body, { color: colors.muted }]}>{MUSCLE_NAMES[r.muscle]}</Text>
                          <Text style={[styles.body, { color: colors.muted }]}>
                            {fmt(r.have)} / {r.target}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </Card>
        )}
        <Text style={{ color: colors.accent, fontWeight: '600', marginTop: 4 }} onPress={() => router.push('/science')}>
          Why this works
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
