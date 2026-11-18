import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme';

// One muscle on the Week tab: a gold ring that fills as its weekly sets
// get done, and turns forest once it hits the target.
export default function MuscleRing({ label, have, target }: { label: string; have: number; target: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, have / target) : 0;
  const shown = Number.isInteger(have) ? String(have) : have.toFixed(1);
  return (
    <View style={{ width: '25%', alignItems: 'center', marginBottom: 12 }}>
      <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={64} height={64} viewBox="0 0 64 64" style={{ position: 'absolute' }}>
          <Circle cx={32} cy={32} r={r} fill="none" stroke={colors.track} strokeWidth={8} />
          {pct > 0 && (
            <Circle
              cx={32}
              cy={32}
              r={r}
              fill="none"
              stroke={pct >= 1 ? colors.good : colors.gold}
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={`${c * pct} ${c}`}
              transform="rotate(-90 32 32)"
            />
          )}
        </Svg>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>{shown}</Text>
      </View>
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 3 }} numberOfLines={1}>
        {label}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 11 }}>of {target}</Text>
    </View>
  );
}
