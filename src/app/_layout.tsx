import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import Feather from '@expo/vector-icons/Feather';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '@/lib/webStyles';
import { AuthProvider, useAuth } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { loadPrefs, usePrefs } from '@/lib/prefs';
import { useProfile } from '@/lib/queries';
import { colors, fonts } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

// Fonction : les couleurs sont lues au rendu, pour suivre le thème.
const legalHeader = () => ({
  headerShown: true,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.cream },
  headerTitleStyle: { fontFamily: fonts.displayHeavy, color: colors.ink },
  headerTintColor: colors.ink,
  headerBackButtonDisplayMode: 'minimal' as const,
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

// Sur mobile, revenir dans l'app relit les données affichées (notifications, rappels…),
// comme le fait déjà le web au retour sur l'onglet.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    ...Feather.font,
  });
  // Langue et thème enregistrés sur l'appareil : lus avant le premier rendu des écrans.
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  useEffect(() => {
    loadPrefs().finally(() => setPrefsLoaded(true));
  }, []);
  const { lang, scheme } = usePrefs();

  // Web : fond de page et contrôles natifs (barres de défilement…) assortis au thème.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.style.colorScheme = scheme;
    document.body.style.backgroundColor = colors.cream;
  }, [scheme]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.cream }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          {/* Changer de langue ou de thème remonte les écrans : textes et feuilles de style sont relus. */}
          {fontsLoaded && prefsLoaded ? <RootNavigator key={`${lang}-${scheme}`} /> : null}
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();
  const profile = useProfile(session?.user.id);
  const profileLoading = !!session && profile.isPending;
  const onboarded = !!profile.data && profile.data.lat != null;

  useEffect(() => {
    if (!loading && !profileLoading) SplashScreen.hideAsync();
  }, [loading, profileLoading]);

  if (loading || profileLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
      {/* L'ordre compte : en cas de redirection, expo-router prend le premier écran autorisé. */}
      <Stack.Protected guard={!!session && onboarded}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !onboarded}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* Accessibles dans tous les états : invitation, liens reçus par email, pages légales. */}
      <Stack.Screen name="join/[code]" />
      <Stack.Screen name="auth/callback" />
      <Stack.Screen name="auth/reset-password" />
      <Stack.Screen name="legal/privacy" options={{ ...legalHeader(), title: t('legal.privacy.title') }} />
      <Stack.Screen name="legal/terms" options={{ ...legalHeader(), title: t('legal.terms.title') }} />
    </Stack>
  );
}
