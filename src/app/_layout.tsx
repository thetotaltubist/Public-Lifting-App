import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { hideSplash } from '../splash';
import { startLaunchUpdateCheck } from '../updates';
import { colors, hexColors } from '../theme';
import { backButtonItems, noItems } from '../components/BackButton';

export default function RootLayout() {
  const scheme = useColorScheme() === 'light' ? 'light' : 'dark';
  // Built once per light/dark mode, so the header (and its back button)
  // isn't redrawn every time this layout renders
  const screenOptions = useMemo(() => {
    const hex = hexColors(scheme);
    return {
      contentStyle: { backgroundColor: colors.bg },
      headerStyle: { backgroundColor: hex.bg },
      headerTintColor: hex.accent,
      headerTitleStyle: { color: hex.text },
      headerShadowVisible: false,
      // Our own back arrow in place of iOS's, which flashed on open
      headerBackVisible: false,
      unstable_headerLeftItems: backButtonItems,
    };
  }, [scheme]);

  // Tells the navigation bar whether the phone is in light or dark mode.
  // Without this it always assumed light, so in dark mode the header drew
  // itself light on top of our dark colors: the back button's round
  // backing flashed bright and the clock and battery went dark-on-dark.
  const navTheme = useMemo(() => {
    const hex = hexColors(scheme);
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: hex.accent,
        background: hex.bg,
        card: hex.bg,
        text: hex.text,
        border: hex.border,
      },
    };
  }, [scheme]);

  useEffect(() => {
    hideSplash(startLaunchUpdateCheck());
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <ThemeProvider value={navTheme}>
        <Stack screenOptions={screenOptions}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen
            name="workout"
            options={{
              title: 'Workout',
              gestureEnabled: false,
              unstable_headerLeftItems: noItems,
            }}
          />
          <Stack.Screen name="science" options={{ title: 'Why this works' }} />
          <Stack.Screen name="program" options={{ title: 'Exercises' }} />
          <Stack.Screen name="new-block" options={{ title: 'New block' }} />
          <Stack.Screen name="one-rm" options={{ title: '1 rep max' }} />
          <Stack.Screen name="training-max" options={{ title: 'Training maxes' }} />
          <Stack.Screen name="new-exercise" options={{ title: 'Add your own', presentation: 'modal' }} />
          <Stack.Screen name="week-summary" options={{ title: 'Last 7 days', presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
