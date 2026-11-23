import { Link, router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AddressSection } from '@/components/AddressSection';
import { ConfirmButton } from '@/components/GroupForm';
import { Avatar } from '@/components/Avatar';
import { CitySearch } from '@/components/CitySearch';
import { ProfileForm } from '@/components/ProfileForm';
import { Chip, Hero } from '@/components/Tiles';
import { Button, ErrorText, Loading, Screen, SectionCard, Segmented, T } from '@/components/ui';
import { countryFlag, monthYear } from '@/lib/geo';
import { type Lang, t } from '@/lib/i18n';
import { type SchemePref, updatePrefs, usePrefs } from '@/lib/prefs';
import { useDeleteAccount, useMyProfile, useSetLocation } from '@/lib/queries';
import { supabase } from '@/lib/supabase';

export default function Me() {
  const { data: profile, isPending } = useMyProfile();
  const setLocation = useSetLocation();
  const [moving, setMoving] = useState(false);

  if (isPending || !profile) return <Loading />;
  const since = monthYear(profile.location_updated_at);

  return (
    <Screen scroll edges={['bottom']}>
      <Stack.Screen options={{ title: '' }} />

      <Hero
        color={profile.pin_color}
        eyebrow={t('me.title')}
        title={profile.display_name}
        badge={<Avatar name={profile.display_name} url={profile.avatar_url} color={profile.pin_color} size={72} ring={0} />}
      >
        {profile.city ? <Chip label={`${countryFlag(profile.country_code)} ${profile.city}, ${profile.country}`} /> : null}
      </Hero>

      <SectionCard icon="home" title={t('me.city')}>
        {moving ? (
          <>
            <CitySearch onSelect={(city) => setLocation.mutate(city, { onSuccess: () => setMoving(false) })} />
            <Button label={t('common.cancel')} kind="ghost" onPress={() => setMoving(false)} />
          </>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="heading">
                {countryFlag(profile.country_code)} {profile.city}
              </T>
              {since ? <T variant="caption">{t('me.since', { date: since })}</T> : null}
            </View>
            <Button label={t('me.moved')} kind="secondary" icon="truck" onPress={() => setMoving(true)} />
          </View>
        )}
        <ErrorText error={setLocation.error} />
      </SectionCard>

      <ProfileForm profile={profile} submitLabel={t('common.save')} full onSaved={() => router.back()} />

      <AddressSection />

      <PreferencesCard />

      <Button label={t('me.signOut')} kind="ghost" icon="log-out" onPress={() => supabase.auth.signOut()} />

      <DeleteAccountCard />

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: 8 }}>
        <Link href="/legal/terms">
          <T variant="caption" style={{ textDecorationLine: 'underline' }}>
            {t('legal.terms.title')}
          </T>
        </Link>
        <T variant="caption">·</T>
        <Link href="/legal/privacy">
          <T variant="caption" style={{ textDecorationLine: 'underline' }}>
            {t('legal.privacy.title')}
          </T>
        </Link>
      </View>
    </Screen>
  );
}

/** Langue et thème de l'appareil. Un changement remonte les écrans : on revient ensuite ici. */
function PreferencesCard() {
  const { lang, prefs } = usePrefs();

  async function change(patch: { lang?: Lang; scheme?: SchemePref }) {
    await updatePrefs(patch);
    // Les écrans viennent d'être remontés sur l'accueil : on rouvre « Mon profil » par-dessus.
    setTimeout(() => router.navigate('/me'), 0);
  }

  return (
    <SectionCard icon="sliders" title={t('prefs.title')}>
      <View style={{ gap: 8 }}>
        <T variant="label">{t('prefs.language')}</T>
        <Segmented
          value={lang}
          onChange={(v) => v !== lang && change({ lang: v })}
          options={[
            { value: 'fr', label: 'Français' },
            { value: 'en', label: 'English' },
          ]}
        />
      </View>
      <View style={{ gap: 8 }}>
        <T variant="label">{t('prefs.theme')}</T>
        <Segmented
          value={prefs.scheme}
          onChange={(v) => v !== prefs.scheme && change({ scheme: v })}
          options={[
            { value: 'system', label: t('prefs.theme.system') },
            { value: 'light', label: t('prefs.theme.light') },
            { value: 'dark', label: t('prefs.theme.dark') },
          ]}
        />
      </View>
    </SectionCard>
  );
}

/** Suppression définitive du compte (exigée par l'App Store et le Play Store), confirmée en deux temps. */
function DeleteAccountCard() {
  const remove = useDeleteAccount();
  return (
    <SectionCard icon="alert-triangle" title={t('account.delete.title')}>
      <T variant="caption">{t('account.delete.body')}</T>
      <ErrorText error={remove.error} />
      <ConfirmButton
        label={t('account.delete.button')}
        confirmLabel={t('account.delete.confirm')}
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </SectionCard>
  );
}
