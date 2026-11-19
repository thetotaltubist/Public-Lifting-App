import { memo } from 'react';
import { Pressable, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { hexColors } from '../theme';

// Our own back arrow on a solid round backing. iOS 26 puts a see-through
// "glass" bubble behind header buttons that picks up the colors of the
// screen sliding underneath it, so it flashed light for a moment on every
// push. We hide that bubble and draw a plain one that never changes.
function BackButtonInner() {
  const scheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const hex = hexColors(scheme);
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Back"
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: hex.card,
        borderWidth: 1,
        borderColor: hex.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}>
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path d="M15 4.5 L7.5 12 L15 19.5" stroke={hex.accent} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

export const BackButton = memo(BackButtonInner);

// Stable functions so the header never sees a "new" button and redraws it.
// unstable_headerLeftItems is what lets us switch off iOS's glass bubble.
const backItems = [{ type: 'custom' as const, element: <BackButton />, hidesSharedBackground: true }];
export const backButtonItems = () => backItems;
export const noItems = () => [];
