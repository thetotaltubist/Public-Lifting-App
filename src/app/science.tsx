import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Badge, Card, Muted, styles } from '../components/ui';
import { daysFor, goalFor, goalInfo, programFor } from '../engine/programs';
import { Settings } from '../engine/types';
import { pubmedLink, pubmedSearch, REFERENCES, SCIENCE } from '../science';
import { loadSettings } from '../storage';
import { colors } from '../theme';

// "Why this works": every rule, how sure the research is, and links to
// the studies on PubMed.

function Link({ label, url }: { label: string; url: string }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: 1, borderColor: colors.border }}>
      <Text style={[styles.body, { flex: 1, fontSize: 13, marginRight: 10 }]}>{label}</Text>
      <Text style={{ color: colors.goldText, fontWeight: '700', fontSize: 13 }}>PubMed ↗</Text>
    </Pressable>
  );
}

export default function ScienceScreen() {
  const [settings, setSettings] = useState<Settings | null>(null);
  useFocusEffect(
    useCallback(() => {
      loadSettings().then(setSettings);
    }, [])
  );

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Muted style={{ marginBottom: 14 }}>What the plan is based on, how sure the research is, and the studies themselves.</Muted>
      {settings && (
        <Card style={{ backgroundColor: colors.accentSoft, borderColor: colors.accentSoft }}>
          <Text style={[styles.h2, { marginBottom: 2 }]}>Your block: {programFor(settings).name}</Text>
          <Muted style={{ marginBottom: 8 }}>
            {goalInfo(goalFor(settings)).name} · {daysFor(settings)} days a week
          </Muted>
          <Text style={[styles.body, { marginBottom: 8 }]}>{programFor(settings).guidance}</Text>
          <Text style={styles.body}>{goalInfo(goalFor(settings)).guidance}</Text>
        </Card>
      )}
      {SCIENCE.map((s) => (
        <Card key={s.title}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={[styles.h2, { flex: 1, marginRight: 8 }]}>{s.title}</Text>
            <Badge label={s.strength} tone={s.strength === 'Emerging' ? 'warn' : 'gold'} />
          </View>
          <Text style={[styles.body, { marginBottom: s.pmids ? 8 : 0 }]}>{s.body}</Text>
          {s.pmids?.map((id) => <Link key={id} label={`PubMed ${id}`} url={pubmedLink(id)} />)}
        </Card>
      ))}
      <Text style={[styles.h2, { marginVertical: 8 }]}>References</Text>
      <Card>
        {REFERENCES.map((r, i) => (
          <Pressable
            key={r}
            onPress={() => Linking.openURL(pubmedSearch(r))}
            style={{ paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderColor: colors.border }}>
            <Muted>
              {r} <Text style={{ color: colors.goldText, fontWeight: '700' }}>PubMed ↗</Text>
            </Muted>
          </Pressable>
        ))}
      </Card>
    </ScrollView>
  );
}
