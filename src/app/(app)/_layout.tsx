import { Stack } from 'expo-router';

import { t } from '@/lib/i18n';
import { colors, fonts } from '@/lib/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.cream },
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
        headerTintColor: colors.ink,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.cream },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="group/[id]/index" />
      <Stack.Screen name="group/[id]/memories" options={{ headerShown: true, title: '' }} />
      <Stack.Screen name="friend/[id]" options={{ headerShown: true, title: '' }} />
      <Stack.Screen name="memory/[id]" options={{ headerShown: true, title: '' }} />
      <Stack.Screen name="memory/new" options={{ headerShown: true, title: t('memory.new.title'), presentation: 'modal' }} />
      <Stack.Screen name="memory/edit/[id]" options={{ headerShown: true, title: t('memory.edit.title'), presentation: 'modal' }} />
      <Stack.Screen name="group/[id]/settings" options={{ headerShown: true, title: '' }} />
      <Stack.Screen name="group/new" options={{ headerShown: true, title: t('group.new.title'), presentation: 'modal' }} />
      <Stack.Screen name="me" options={{ headerShown: true, title: '' }} />
    </Stack>
  );
}
