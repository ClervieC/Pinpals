import * as Linking from 'expo-linking';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Button, ErrorText, Field, Screen, T } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors, fonts, pastels } from '@/lib/theme';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function sendLink() {
    setLoading(true);
    setError(null);
    const address = email.trim().toLowerCase();
    const { error: e } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: Linking.createURL('/auth/callback') },
    });
    setLoading(false);
    if (e) setError(e);
    else setSentTo(address);
  }

  // Alternative au lien : le code à 6 chiffres de l'email ({{ .Token }} dans le template Supabase).
  async function verifyCode() {
    if (!sentTo) return;
    setLoading(true);
    setError(null);
    const { error: e } = await supabase.auth.verifyOtp({ email: sentTo, token: code.trim(), type: 'email' });
    setLoading(false);
    if (e) setError(e);
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
          <T style={{ color: colors.inkSoft, textAlign: 'center' }}>
            La carte de tes potes : où vit ta promo, tes amis d&apos;enfance, ta team.
          </T>
        </View>

        {sentTo ? (
          <View style={{ gap: 14 }}>
            <T variant="heading">Regarde tes mails 💌</T>
            <T>
              On a envoyé un lien magique à <T style={{ fontFamily: fonts.bold }}>{sentTo}</T>. Ouvre-le sur ce téléphone, ou
              colle le code reçu.
            </T>
            <Field
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
            />
            <ErrorText error={error} />
            <Button label="Valider le code" onPress={verifyCode} loading={loading} disabled={code.trim().length < 6} />
            <Button label="Changer d'adresse" kind="ghost" onPress={() => setSentTo(null)} />
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <Field
              label="Ton email"
              value={email}
              onChangeText={setEmail}
              placeholder="toi@exemple.fr"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              onSubmitEditing={sendLink}
            />
            <ErrorText error={error} />
            <Button label="Recevoir un lien magique ✨" onPress={sendLink} loading={loading} disabled={!email.includes('@')} />
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
