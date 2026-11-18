import { memo } from 'react';
import { Pressable, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { hexColors } from '../theme';

// Our own back arrow. iOS's built-in back button kept redrawing (flashing)
// when "Why this works" opened, so screens use this plain one instead.
function BackButtonInner() {
  const scheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const color = hexColors(scheme).accent;
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Back"
      style={{ paddingHorizontal: 4, paddingVertical: 4 }}
    >
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path d="M15 5 L8 12 L15 19" stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

export const BackButton = memo(BackButtonInner);

// Stable functions so the header never sees a "new" button and redraws it
export const renderBackButton = () => <BackButton />;
export const renderNoButton = () => null;
