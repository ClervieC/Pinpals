import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, ErrorText, Loading, Screen, T } from '@/components/ui';
import { supabase } from '@/lib/supabase';

/** Retour du lien magique (flow PKCE) : pinpals://auth/callback?code=… */
export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const error = exchangeError ?? params.error_description ?? (params.code ? null : 'Lien invalide ou expiré.');

  useEffect(() => {
    if (!params.code) return;
    supabase.auth.exchangeCodeForSession(params.code).then(({ error: e }) => {
      if (e) setExchangeError(e.message);
      else router.replace('/');
    });
  }, [params.code]);

  if (!error) return <Loading />;

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
        <T variant="title">Oups 🙈</T>
        <ErrorText error={error} />
        <T>Le lien doit être ouvert sur l&apos;appareil où tu l&apos;as demandé. Tu peux aussi saisir le code reçu par email.</T>
        <Button label="Revenir à la connexion" onPress={() => router.replace('/sign-in')} />
      </View>
    </Screen>
  );
}
