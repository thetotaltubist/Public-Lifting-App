import { ReactNode } from 'react';
import { Pressable, StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import { themeColors } from '../theme';

// Small building blocks so every screen looks the same.
// Forest is for actions (the main button, checked sets), gold for progress.

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'plain' | 'danger';
  disabled?: boolean;
}) {
  const colors = themeColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        kind === 'primary' ? { backgroundColor: colors.accent } : { backgroundColor: colors.chip },
        (pressed || disabled) && { opacity: 0.6 },
      ]}>
      <Text style={[styles.buttonText, { color: kind === 'primary' ? colors.onAccent : kind === 'danger' ? colors.danger : colors.text }]}>
        {title}
      </Text>
    </Pressable>
  );
}

// fill: share a single row evenly with the chips beside it, shrinking the
// text a little if a label is long, instead of wrapping onto a second line
export function Chip({ label, selected, onPress, fill }: { label: string; selected?: boolean; onPress: () => void; fill?: boolean }) {
  const colors = themeColors();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, fill && styles.chipFill, { backgroundColor: selected ? colors.accent : colors.chip }]}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit={fill}
        minimumFontScale={0.75}
        style={{ color: selected ? colors.onAccent : colors.text, fontWeight: '600', fontSize: 14, textAlign: 'center' }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Badge({ label, tone = 'accent' }: { label: string; tone?: 'accent' | 'warn' | 'gold' }) {
  const colors = themeColors();
  return (
    <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
      <Text style={{ color: tone === 'warn' ? colors.warn : tone === 'gold' ? colors.goldText : colors.text, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: object }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

const base = {
  button: { borderRadius: 16, paddingVertical: 15, paddingHorizontal: 22, alignItems: 'center' },
  buttonText: { fontSize: 17, fontWeight: '800' },
  chip: { borderRadius: 16, paddingVertical: 7, paddingHorizontal: 13, marginRight: 8, marginBottom: 8 },
  chipFill: { flex: 1, paddingHorizontal: 4, marginRight: 0, alignItems: 'center' },
  badge: { borderRadius: 99, paddingVertical: 3, paddingHorizontal: 9, alignSelf: 'flex-start' },
  screen: { padding: 16, paddingBottom: 48 },
} satisfies Record<string, ViewStyle | TextStyle>;

export const styles = {
  ...base,
  get card(): ViewStyle {
    return { backgroundColor: themeColors().card, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: themeColors().border };
  },
  get title(): TextStyle {
    return { color: themeColors().text, fontSize: 32, fontWeight: '900', letterSpacing: -1, marginBottom: 4 };
  },
  get muted(): TextStyle {
    return { color: themeColors().muted, fontSize: 14, lineHeight: 19 };
  },
  get h2(): TextStyle {
    return { color: themeColors().text, fontSize: 18, fontWeight: '700' };
  },
  get body(): TextStyle {
    return { color: themeColors().text, fontSize: 15, lineHeight: 21 };
  },
};
