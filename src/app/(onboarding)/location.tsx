import { CitySearch } from '@/components/CitySearch';
import { ErrorText, Screen, T } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useMyProfile, useSetLocation } from '@/lib/queries';
import { colors } from '@/lib/theme';

export default function OnboardingLocation() {
  const { data: profile } = useMyProfile();
  const setLocation = useSetLocation();

  return (
    <Screen scroll>
      <T variant="title">{t('onboarding.location.title')}</T>
      <T>{t('onboarding.location.body')}</T>
      {/* Une fois la ville enregistrée, le layout racine bascule tout seul vers l'app. */}
      <CitySearch accent={profile?.pin_color ?? colors.pink} onSelect={(city) => setLocation.mutate(city)} />
      <ErrorText error={setLocation.error} />
    </Screen>
  );
}
