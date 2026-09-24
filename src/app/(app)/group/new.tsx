import { router } from 'expo-router';

import { GroupForm } from '@/components/GroupForm';
import { Screen, T } from '@/components/ui';
import { useCreateGroup } from '@/lib/queries';

export default function NewGroup() {
  const create = useCreateGroup();

  return (
    <Screen scroll>
      <T>Un groupe = une carte. Tu pourras inviter tout le monde avec un lien juste après.</T>
      <GroupForm
        submitLabel="Créer le groupe"
        loading={create.isPending}
        error={create.error}
        onSubmit={(values) =>
          create.mutate(values, {
            onSuccess: (id) => router.replace({ pathname: '/group/[id]', params: { id } }),
          })
        }
      />
    </Screen>
  );
}
