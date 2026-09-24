import { Stack } from 'expo-router';

import { colors, fonts } from '@/lib/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.cream },
        headerTitleStyle: { fontFamily: fonts.black, color: colors.ink },
        headerTintColor: colors.ink,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.cream },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="group/[id]/index" />
      <Stack.Screen name="group/[id]/settings" options={{ headerShown: true, title: 'Réglages du groupe' }} />
      <Stack.Screen name="group/new" options={{ headerShown: true, title: 'Nouveau groupe', presentation: 'modal' }} />
      <Stack.Screen name="me" options={{ headerShown: true, title: 'Mon profil' }} />
    </Stack>
  );
}
