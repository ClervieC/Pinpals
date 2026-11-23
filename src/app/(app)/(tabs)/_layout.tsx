import { Tabs } from 'expo-router';
import { type ColorValue, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui';
import { t } from '@/lib/i18n';
import { colors, fonts } from '@/lib/theme';

function icon(name: IconName) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <Icon name={name} size={21} color={color as string} />;
  };
}

export default function TabsLayout() {
  // Hauteur explicite : icône + libellé tiennent en entier, au-dessus de la barre système
  // (indicateur d'accueil iPhone, navigation gestuelle Android).
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, Platform.OS === 'web' ? 8 : 12);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.cream },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15, marginTop: 2 },
        tabBarItemStyle: { paddingVertical: 4 },
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.line,
          height: 64 + bottom,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.groups'), tabBarIcon: icon('map') }} />
      <Tabs.Screen name="friends" options={{ title: t('tabs.friends'), tabBarIcon: icon('users') }} />
      <Tabs.Screen name="memories" options={{ title: t('tabs.memories'), tabBarIcon: icon('book-open') }} />
    </Tabs>
  );
}
