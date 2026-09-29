import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AddressSection } from '@/components/AddressSection';
import { CitySearch } from '@/components/CitySearch';
import { ProfileForm } from '@/components/ProfileForm';
import { Button, ErrorText, Loading, Screen, T } from '@/components/ui';
import { countryFlag, monthYear } from '@/lib/geo';
import { t } from '@/lib/i18n';
import { useMyProfile, useSetLocation } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/lib/theme';

export default function Me() {
  const { data: profile, isPending } = useMyProfile();
  const setLocation = useSetLocation();
  const [moving, setMoving] = useState(false);

  if (isPending || !profile) return <Loading />;

  return (
    <Screen scroll>
      <View style={styles.city}>
        <T variant="label">{t('me.city')}</T>
        {moving ? (
          <>
            <CitySearch accent={profile.pin_color} onSelect={(city) => setLocation.mutate(city, { onSuccess: () => setMoving(false) })} />
            <Button label={t('common.cancel')} kind="ghost" onPress={() => setMoving(false)} />
          </>
        ) : (
          <>
            <T style={{ fontFamily: fonts.black, fontSize: 22 }}>
              {countryFlag(profile.country_code)} {profile.city}, {profile.country}
            </T>
            <T variant="caption">{t('me.since', { date: monthYear(profile.location_updated_at) ?? '' })}</T>
            <Button label={t('me.moved')} kind="ghost" onPress={() => setMoving(true)} />
          </>
        )}
        <ErrorText error={setLocation.error} />
      </View>

      <ProfileForm profile={profile} submitLabel={t('common.save')} full onSaved={() => router.back()} />

      <AddressSection />

      <Button label={t('me.signOut')} kind="danger" onPress={() => supabase.auth.signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  city: { padding: 16, gap: 6, borderRadius: radius.lg, backgroundColor: colors.paper },
});
