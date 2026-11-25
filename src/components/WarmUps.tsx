import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PlannedSet } from '../engine/wave';
import { Settings } from '../engine/types';
import { toDisplay } from '../storage';
import { colors } from '../theme';

// ------------------------------------------------------------------
// Warm-up sets before an exercise's working sets: one chip per set, tap
// to check it off. They aren't logged as sets and don't start the rest
// timer, so they never count toward your weekly sets.
// ------------------------------------------------------------------

export default function WarmUps({
  sets,
  done,
  unit,
  onToggle,
  large,
}: {
  sets: PlannedSet[];
  done: number[];
  unit: Settings['unit'];
  onToggle: (k: number) => void;
  large?: boolean;
}) {
  if (!sets.length) return null;
  return (
    <View style={{ marginBottom: large ? 0 : 10 }}>
      <Text style={{ color: colors.muted, fontSize: large ? 14 : 12, fontWeight: '700', marginBottom: 6 }}>
        Warm-up{large ? '' : ` (${unit})`} · not counted
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {sets.map((s, k) => {
          const checked = done.includes(k);
          return (
            <Pressable
              key={k}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                onToggle(k);
              }}
              hitSlop={4}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              accessibilityLabel={`Warm-up ${toDisplay(s.weight, unit)} ${unit} for ${s.reps}`}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: large ? 9 : 6,
                paddingHorizontal: large ? 12 : 10,
                borderRadius: 10,
                backgroundColor: checked ? colors.good : colors.chip,
                opacity: pressed ? 0.6 : 1,
              })}>
              <Text style={{ color: checked ? colors.onAccent : colors.text, fontWeight: '700', fontSize: large ? 16 : 14, fontVariant: ['tabular-nums'] }}>
                {checked ? '✓ ' : ''}
                {toDisplay(s.weight, unit)}
                {large ? ` ${unit}` : ''} × {s.reps}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
