import { ProfileForm } from '@/components/ProfileForm';
import { Screen, T } from '@/components/ui';

export default function OnboardingProfile() {
  return (
    <Screen scroll>
      <T variant="title">Enchanté·e 👋</T>
      <T>Choisis ta tête et la couleur de ton pin. Tes amis te verront comme ça sur la carte.</T>
      <ProfileForm profile={null} submitLabel="Continuer" />
    </Screen>
  );
}
