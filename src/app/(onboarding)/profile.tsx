import { Steps } from '@/components/decor';
import { ProfileForm } from '@/components/ProfileForm';
import { PageHeader, Screen, T } from '@/components/ui';
import { t } from '@/lib/i18n';
import { colors } from '@/lib/theme';

export default function OnboardingProfile() {
  return (
    <Screen scroll>
      <Steps current={1} total={2} />
      <PageHeader title={t('onboarding.profile.title')} />
      <T style={{ color: colors.inkSoft }}>{t('onboarding.profile.body')}</T>
      <ProfileForm profile={null} submitLabel={t('common.continue')} />
    </Screen>
  );
}
