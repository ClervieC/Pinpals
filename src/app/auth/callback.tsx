import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { AuthMessage } from '@/components/AuthMessage';
import { Button, ErrorText, Loading, T } from '@/components/ui';
import { t } from '@/lib/i18n';
import { pendingInvite } from '@/lib/invite';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

/** Retour du lien de confirmation d'email (flow PKCE) : pinpals://auth/callback?code=… */
export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; invite?: string; error_description?: string }>();
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const error = exchangeError ?? params.error_description ?? (params.code ? null : t('callback.invalid'));

  useEffect(() => {
    // Inscription faite depuis une invitation : on la reprendra après l'onboarding (ou après
    // une connexion manuelle, si l'email a été ouvert dans un autre navigateur).
    if (params.invite) pendingInvite.set(params.invite.trim().toUpperCase());
  }, [params.invite]);

  useEffect(() => {
    if (!params.code) return;
    supabase.auth.exchangeCodeForSession(params.code).then(({ error: e }) => {
      if (e) setExchangeError(e.message);
      else router.replace('/');
    });
  }, [params.code]);

  if (!error) return <Loading />;

  return (
    <AuthMessage title={t('callback.title')}>
      <ErrorText error={error} />
      <T style={{ color: colors.inkSoft }}>{t('callback.body')}</T>
      <Button label={t('callback.back')} onPress={() => router.replace('/sign-in')} />
    </AuthMessage>
  );
}
