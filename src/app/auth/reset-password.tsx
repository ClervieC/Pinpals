import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { AuthMessage } from '@/components/AuthMessage';
import { PasswordField, PasswordHint } from '@/components/decor';
import { Button, ErrorText, Loading, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { authErrorMessage, MIN_PASSWORD } from '@/lib/authErrors';
import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

/** Retour du mail « mot de passe oublié » (flow PKCE) : pinpals://auth/reset-password?code=… */
export default function ResetPassword() {
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const { session } = useAuth();
  const [exchanged, setExchanged] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(
    params.error_description ?? (params.code ? null : t('callback.invalid')),
  );
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = password.length >= MIN_PASSWORD;

  useEffect(() => {
    if (!params.code) return;
    supabase.auth.exchangeCodeForSession(params.code).then(({ error: e }) => {
      if (e) setLinkError(authErrorMessage(e));
      else setExchanged(true);
    });
  }, [params.code]);

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    const { error: e } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (e) setError(authErrorMessage(e));
    else router.replace('/');
  }

  if (linkError) {
    return (
      <AuthMessage title={t('callback.title')}>
        <ErrorText error={linkError} />
        <T style={{ color: colors.inkSoft }}>{t('reset.linkBody')}</T>
        <Button label={t('callback.back')} onPress={() => router.replace('/sign-in')} />
      </AuthMessage>
    );
  }

  if (!exchanged || !session) return <Loading />;

  return (
    <AuthMessage title={t('reset.title')}>
      <T style={{ color: colors.inkSoft }}>{t('reset.body')}</T>
      <PasswordField label={t('auth.password')} value={password} onChangeText={setPassword} isNew onSubmitEditing={save} />
      <PasswordHint length={password.length} />
      <ErrorText error={error} />
      <Button label={t('common.save')} onPress={save} loading={saving} disabled={!valid} />
    </AuthMessage>
  );
}
