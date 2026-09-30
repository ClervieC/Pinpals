import { CitySearch } from '@/components/CitySearch';
import { Chip } from '@/components/Tiles';
import { ErrorText, PageHeader, Screen, SectionCard, T } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useSetLocation } from '@/lib/queries';
import { colors } from '@/lib/theme';

export default function OnboardingLocation() {
  const setLocation = useSetLocation();

  return (
    <Screen scroll>
      <PageHeader eyebrow={t('onboarding.step', { step: 2, total: 2 })} title={t('onboarding.location.title')} />
      <T style={{ color: colors.inkSoft }}>{t('onboarding.location.body')}</T>
      <SectionCard icon="map-pin" title={t('onboarding.location.search')} right={<Chip icon="lock" label={t('onboarding.location.private')} />}>
        {/* Une fois la ville enregistrée, le layout racine bascule tout seul vers l'app. */}
        <CitySearch onSelect={(city) => setLocation.mutate(city)} />
        <ErrorText error={setLocation.error} />
      </SectionCard>
    </Screen>
  );
}
