import * as Linking from 'expo-linking';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { FloatingLogo, PasswordField, PasswordHint } from '@/components/decor';
import { Button, Card, ErrorText, Field, Screen, Segmented, T } from '@/components/ui';
import { authErrorMessage, MIN_PASSWORD } from '@/lib/authErrors';
import { t } from '@/lib/i18n';
import { pendingInvite } from '@/lib/invite';
import { supabase } from '@/lib/supabase';
import { colors, fonts, themed } from '@/lib/theme';

type Mode = 'sign-in' | 'sign-up' | 'forgot';

export default function SignIn() {
  // ?mode=sign-up depuis un lien d'invitation : on arrive direct sur l'inscription.
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'sign-up' ? 'sign-up' : 'sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Email auquel on vient d'envoyer un mail (confirmation d'inscription ou reset).
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pas de défilement : tout tient dans l'écran, le logo se réduit si la place manque.
  const { height } = useWindowDimensions();
  const keyboardOpen = useKeyboardOpen();
  const small = height < 720 || keyboardOpen;
  const compact = mode === 'forgot' || !!sentTo || keyboardOpen;
  const logoSize = keyboardOpen ? 64 : compact || height < 720 ? 96 : 140;

  const isSignUp = mode === 'sign-up';
  const address = email.trim().toLowerCase();
  const canSubmit = address.includes('@') && (mode === 'forgot' || password.length >= (isSignUp ? MIN_PASSWORD : 1));

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  // En cas de succès, onAuthStateChange (dans _layout) redirige vers l'onboarding ou l'app.
  async function submit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);

    if (mode === 'sign-in') {
      const { error: e } = await supabase.auth.signInWithPassword({ email: address, password });
      setLoading(false);
      if (e) setError(authErrorMessage(e));
      return;
    }

    if (mode === 'sign-up') {
      // Invitation en cours : le code voyage dans le lien de confirmation, au cas où
      // l'email serait ouvert dans un autre navigateur que celui de l'inscription.
      const invite = await pendingInvite.get();
      const { data, error: e } = await supabase.auth.signUp({
        email: address,
        password,
        options: { emailRedirectTo: Linking.createURL('/auth/callback', { queryParams: invite ? { invite } : undefined }) },
      });
      setLoading(false);
      if (e) setError(authErrorMessage(e));
      // Email déjà inscrit : Supabase renvoie un faux succès sans identité et n'envoie aucun mail.
      else if (data.user?.identities?.length === 0) setError(t('auth.error.userExists'));
      // Pas de session : le projet exige une confirmation par email.
      else if (!data.session) setSentTo(address);
      return;
    }

    const { error: e } = await supabase.auth.resetPasswordForEmail(address, {
      redirectTo: Linking.createURL('/auth/reset-password'),
    });
    setLoading(false);
    if (e) setError(authErrorMessage(e));
    else setSentTo(address);
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.body, { gap: small ? 14 : 22 }]}>
        <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.hero}>
          <FloatingLogo size={logoSize} />
          <T variant="title" style={[styles.headline, logoSize < 100 && { fontSize: 28, lineHeight: 32 }]}>
            {t('auth.headline')}
          </T>
          {compact || height < 700 ? null : <T style={styles.tagline}>{t('auth.tagline')}</T>}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).springify().damping(16)}>
          <Card style={{ gap: 16 }}>
            {sentTo ? (
              <Animated.View key="sent" entering={FadeIn} style={styles.sent}>
                <T style={{ fontSize: 48 }}>💌</T>
                <T variant="heading" style={{ textAlign: 'center' }}>
                  {isSignUp ? t('auth.confirm.title') : t('auth.forgot.sentTitle')}
                </T>
                <T style={{ textAlign: 'center', color: colors.inkSoft }}>
                  {isSignUp ? t('auth.confirm.body', { email: sentTo }) : t('auth.forgot.sentBody', { email: sentTo })}
                </T>
                <Button
                  label={isSignUp ? t('auth.confirm.done') : t('callback.back')}
                  kind={isSignUp ? 'primary' : 'ghost'}
                  style={{ alignSelf: 'stretch' }}
                  onPress={() => {
                    setSentTo(null);
                    switchMode('sign-in');
                  }}
                />
              </Animated.View>
            ) : (
              <>
                {mode === 'forgot' ? (
                  <Animated.View key="forgot" entering={FadeIn} style={{ gap: 6 }}>
                    <Pressable onPress={() => switchMode('sign-in')} hitSlop={10} style={{ alignSelf: 'flex-start' }}>
                      <T variant="label">← {t('common.back')}</T>
                    </Pressable>
                    <T variant="heading">{t('auth.forgot.title')}</T>
                    <T style={{ color: colors.inkSoft }}>{t('auth.forgot.body')}</T>
                  </Animated.View>
                ) : (
                  <Segmented
                    value={mode}
                    onChange={switchMode}
                    options={[
                      { value: 'sign-in', label: t('auth.signIn.title') },
                      { value: 'sign-up', label: t('auth.signUp.title') },
                    ]}
                  />
                )}

                <Field
                  label={t('auth.email')}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('auth.emailPlaceholder')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType={isSignUp ? 'username' : 'emailAddress'}
                  onSubmitEditing={submit}
                />

                {mode !== 'forgot' ? (
                  <View style={{ gap: 8 }}>
                    <PasswordField
                      label={t('auth.password')}
                      value={password}
                      onChangeText={setPassword}
                      isNew={isSignUp}
                      onSubmitEditing={submit}
                    />
                    {isSignUp ? (
                      <PasswordHint length={password.length} />
                    ) : (
                      <Pressable onPress={() => switchMode('forgot')} hitSlop={8} style={{ alignSelf: 'flex-end' }}>
                        <T variant="label" style={{ color: colors.accent }}>
                          {t('auth.forgot.link')}
                        </T>
                      </Pressable>
                    )}
                  </View>
                ) : null}

                <ErrorText error={error} />
                <Button
                  label={
                    mode === 'sign-in' ? t('auth.signIn.submit') : isSignUp ? t('auth.signUp.submit') : t('auth.forgot.submit')
                  }
                  onPress={submit}
                  loading={loading}
                  disabled={!canSubmit}
                />
              </>
            )}
          </Card>
        </Animated.View>

        {sentTo ? null : (
          <View style={{ gap: 6 }}>
            {isSignUp ? (
              <T variant="caption" style={styles.footnote}>
                {t('auth.privacyNote')}
              </T>
            ) : null}
            <T variant="caption" style={styles.footnote}>
              {isSignUp ? t('auth.legal.signUp') : t('auth.legal.signIn')}
              <Link href="/legal/terms" style={styles.link}>
                {t('auth.legal.terms')}
              </Link>
              {t('auth.legal.and')}
              <Link href="/legal/privacy" style={styles.link}>
                {t('auth.legal.privacy')}
              </Link>
              .
            </T>
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}

const styles = themed(() =>
  StyleSheet.create({
    body: { flex: 1, justifyContent: 'center', width: '100%', maxWidth: 440, alignSelf: 'center' },
    hero: { alignItems: 'center', gap: 6 },
    headline: { fontSize: 34, lineHeight: 38, textAlign: 'center' },
    tagline: { color: colors.inkSoft, textAlign: 'center', maxWidth: 340 },
    sent: { alignItems: 'center', gap: 10 },
    footnote: { textAlign: 'center' },
    link: { fontFamily: fonts.semibold, color: colors.ink, textDecorationLine: 'underline' },
  }),
);
