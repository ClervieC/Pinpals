import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/ui';
import { t } from '@/lib/i18n';
import { colors, fonts } from '@/lib/theme';

function icon(name: IconName) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <Icon name={name} size={21} color={color as string} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.cream },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.paper, borderTopColor: colors.line },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.groups'), tabBarIcon: icon('map') }} />
      <Tabs.Screen name="friends" options={{ title: t('tabs.friends'), tabBarIcon: icon('users') }} />
      <Tabs.Screen name="memories" options={{ title: t('tabs.memories'), tabBarIcon: icon('book-open') }} />
    </Tabs>
  );
}
