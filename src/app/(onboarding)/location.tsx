import { CitySearch } from '@/components/CitySearch';
import { ErrorText, Screen, T } from '@/components/ui';
import { useMyProfile, useSetLocation } from '@/lib/queries';
import { colors } from '@/lib/theme';

export default function OnboardingLocation() {
  const { data: profile } = useMyProfile();
  const setLocation = useSetLocation();

  return (
    <Screen scroll>
      <T variant="title">Tu vis où ? 📍</T>
      <T>
        Juste ta ville, jamais ta position exacte. Ton pin sera placé près du centre-ville, légèrement décalé pour ne pas
        chevaucher les autres.
      </T>
      {/* Une fois la ville enregistrée, le layout racine bascule tout seul vers l'app. */}
      <CitySearch accent={profile?.pin_color ?? colors.pink} onSelect={(city) => setLocation.mutate(city)} />
      <ErrorText error={setLocation.error} />
    </Screen>
  );
}
