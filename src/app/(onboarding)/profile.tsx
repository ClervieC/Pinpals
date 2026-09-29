import { ProfileForm } from '@/components/ProfileForm';
import { Screen, T } from '@/components/ui';
import { t } from '@/lib/i18n';

export default function OnboardingProfile() {
  return (
    <Screen scroll>
      <T variant="title">{t('onboarding.profile.title')}</T>
      <T>{t('onboarding.profile.body')}</T>
      <ProfileForm profile={null} submitLabel={t('common.continue')} />
    </Screen>
  );
}
