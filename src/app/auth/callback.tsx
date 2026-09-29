import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, ErrorText, Loading, Screen, T } from '@/components/ui';
import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

/** Retour du lien de confirmation d'email (flow PKCE) : pinpals://auth/callback?code=… */
export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const error = exchangeError ?? params.error_description ?? (params.code ? null : t('callback.invalid'));

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
        <T variant="title">{t('callback.title')}</T>
        <ErrorText error={error} />
        <T>{t('callback.body')}</T>
        <Button label={t('callback.back')} onPress={() => router.replace('/sign-in')} />
      </View>
    </Screen>
  );
}
