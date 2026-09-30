import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AddressSection } from '@/components/AddressSection';
import { Avatar } from '@/components/Avatar';
import { CitySearch } from '@/components/CitySearch';
import { ProfileForm } from '@/components/ProfileForm';
import { Chip, Hero } from '@/components/Tiles';
import { Button, ErrorText, Loading, Screen, SectionCard, T } from '@/components/ui';
import { countryFlag, monthYear } from '@/lib/geo';
import { t } from '@/lib/i18n';
import { useMyProfile, useSetLocation } from '@/lib/queries';
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

      <Button label={t('me.signOut')} kind="ghost" icon="log-out" onPress={() => supabase.auth.signOut()} />
    </Screen>
  );
}
