import type { AuthError } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Button, ErrorText, Field, Screen, T } from '@/components/ui';
import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { colors, pastels } from '@/lib/theme';

type Mode = 'sign-in' | 'sign-up';

const MIN_PASSWORD = 6;

// Les messages de Supabase Auth sont en anglais : on traduit les cas courants.
function authMessage(e: AuthError) {
  switch (e.code) {
    case 'invalid_credentials':
      return t('auth.error.invalidCredentials');
    case 'user_already_exists':
    case 'email_exists':
      return t('auth.error.userExists');
    case 'weak_password':
      return t('auth.error.weakPassword', { min: MIN_PASSWORD });
    case 'email_not_confirmed':
      return t('auth.error.emailNotConfirmed');
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return t('auth.error.rateLimit');
    default:
      return e.message;
  }
}

export default function SignIn() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmSentTo, setConfirmSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === 'sign-up';
  const canSubmit = email.includes('@') && password.length >= (isSignUp ? MIN_PASSWORD : 1);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  // En cas de succès, onAuthStateChange (dans _layout) redirige vers l'onboarding ou l'app.
  async function submit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    const address = email.trim().toLowerCase();

    if (isSignUp) {
      const { data, error: e } = await supabase.auth.signUp({
        email: address,
        password,
        options: { emailRedirectTo: Linking.createURL('/auth/callback') },
      });
      setLoading(false);
      if (e) setError(authMessage(e));
      // Email déjà inscrit : Supabase renvoie un faux succès sans identité et n'envoie aucun mail.
      else if (data.user?.identities?.length === 0) setError(t('auth.error.userExists'));
      // Pas de session : le projet exige une confirmation par email.
      else if (!data.session) setConfirmSentTo(address);
      return;
    }

    const { error: e } = await supabase.auth.signInWithPassword({ email: address, password });
    setLoading(false);
    if (e) setError(authMessage(e));
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.body}>
        <View style={styles.hero}>
          <View style={styles.pins}>
            {pastels.slice(0, 5).map((c, i) => (
              <View key={c} style={[styles.dot, { backgroundColor: c, marginTop: i % 2 ? 18 : 0 }]} />
            ))}
          </View>
          <T variant="title" style={{ fontSize: 42 }}>
            Pinpals
          </T>
          <T style={{ color: colors.inkSoft, textAlign: 'center' }}>{t('auth.tagline')}</T>
        </View>

        {confirmSentTo ? (
          <View style={{ gap: 14 }}>
            <T variant="heading">{t('auth.confirm.title')}</T>
            <T>{t('auth.confirm.body', { email: confirmSentTo })}</T>
            <Button
              label={t('auth.confirm.done')}
              onPress={() => {
                setConfirmSentTo(null);
                switchMode('sign-in');
              }}
            />
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <T variant="heading">{isSignUp ? t('auth.signUp.title') : t('auth.signIn.title')}</T>
            <Field
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <Field
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              placeholder={isSignUp ? t('auth.passwordMin', { min: MIN_PASSWORD }) : '••••••••'}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              textContentType={isSignUp ? 'newPassword' : 'password'}
              onSubmitEditing={submit}
            />
            <ErrorText error={error} />
            <Button
              label={isSignUp ? t('auth.signUp.submit') : t('auth.signIn.submit')}
              onPress={submit}
              loading={loading}
              disabled={!canSubmit}
            />
            <Button
              label={isSignUp ? t('auth.toSignIn') : t('auth.toSignUp')}
              kind="ghost"
              onPress={() => switchMode(isSignUp ? 'sign-in' : 'sign-up')}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center', gap: 40 },
  hero: { alignItems: 'center', gap: 10 },
  pins: { flexDirection: 'row', gap: 10, marginBottom: 12, height: 56 },
  dot: { width: 34, height: 34, borderRadius: 17, borderWidth: 4, borderColor: colors.paper },
});
