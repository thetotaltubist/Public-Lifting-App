import { Stack } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { hideSplash } from '../splash';
import { startLaunchUpdateCheck } from '../updates';
import { colors, hexColors } from '../theme';

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
      // A fixed "Back" label, so iOS never works one out from the previous
      // screen (which showed "(tabs)" and redrew the button as it changed)
      headerBackTitle: 'Back',
      headerBackButtonMenuEnabled: false,
    };
  }, [scheme]);

  useEffect(() => {
    hideSplash(startLaunchUpdateCheck());
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="workout" options={{ title: 'Workout', gestureEnabled: false, headerBackVisible: false }} />
        <Stack.Screen name="science" options={{ title: 'Why this works' }} />
        <Stack.Screen name="program" options={{ title: 'Exercises' }} />
        <Stack.Screen name="new-block" options={{ title: 'New block' }} />
        <Stack.Screen name="one-rm" options={{ title: '1 rep max' }} />
        <Stack.Screen name="new-exercise" options={{ title: 'Add your own', presentation: 'modal' }} />
        <Stack.Screen name="week-summary" options={{ title: 'Last 7 days', presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
