import { Stack } from 'expo-router';

import { useMyProfile } from '@/lib/queries';

export default function OnboardingLayout() {
  const { data: profile } = useMyProfile();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Profil créé : on passe directement au choix de la ville. */}
      <Stack.Protected guard={!profile}>
        <Stack.Screen name="profile" />
      </Stack.Protected>
      <Stack.Screen name="location" />
    </Stack>
  );
}
