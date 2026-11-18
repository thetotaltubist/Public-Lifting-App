import { useEffect, useState } from 'react';
import { Redirect, Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { loadSettings } from '../../storage';
import { colors } from '../../theme';


function TabSymbol({ outline, filled, color, focused }: { outline: string; filled: string; color: any; focused: boolean }) {
  return <SymbolView name={(focused ? filled : outline) as any} tintColor={color} size={24} type="monochrome" />;
}

export default function TabLayout() {
  // The first time the app opens, go through setup first
  const [setupDone, setSetupDone] = useState<boolean | null>(null);
  useEffect(() => {
    loadSettings().then((s) => setSetupDone(!!s.setupDone));
  }, []);
  if (setupDone === null) return null;
  if (!setupDone) return <Redirect href="/new-block?first=1" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text as string,
        tabBarInactiveTintColor: colors.muted as string,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarLabelStyle: { fontWeight: '600', fontSize: 11 },
        tabBarLabelPosition: 'below-icon',
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, focused }) => <TabSymbol outline="dumbbell" filled="dumbbell.fill" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="volume"
        options={{
          title: 'Week',
          tabBarIcon: ({ color, focused }) => <TabSymbol outline="chart.bar" filled="chart.bar.fill" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="body"
        options={{
          title: 'Body',
          tabBarIcon: ({ color, focused }) => <TabSymbol outline="heart" filled="heart.fill" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => <TabSymbol outline="clock" filled="clock.fill" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => <TabSymbol outline="gearshape" filled="gearshape.fill" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
