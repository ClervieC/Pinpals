import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { t } from '@/lib/i18n';
import { colors, fonts } from '@/lib/theme';

function icon(emoji: string) {
  return function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.cream },
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 12 },
        tabBarStyle: { backgroundColor: colors.paper, borderTopColor: colors.line },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.groups'), tabBarIcon: icon('🗺️') }} />
      <Tabs.Screen name="friends" options={{ title: t('tabs.friends'), tabBarIcon: icon('💛') }} />
      <Tabs.Screen name="memories" options={{ title: t('tabs.memories'), tabBarIcon: icon('📔') }} />
    </Tabs>
  );
}
