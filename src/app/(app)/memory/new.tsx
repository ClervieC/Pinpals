import { router, useLocalSearchParams } from 'expo-router';

import { MemoryForm } from '@/components/MemoryForm';
import { Screen } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useCreateMemory } from '@/lib/queries';

/** Nouveau souvenir, éventuellement pré-rempli depuis un groupe ou la page d'un·e ami·e. */
export default function NewMemory() {
  const { groupId, friendId } = useLocalSearchParams<{ groupId?: string; friendId?: string }>();
  const create = useCreateMemory();

  return (
    <Screen scroll edges={['bottom']}>
      <MemoryForm
        defaultGroupId={groupId ?? null}
        defaultPeople={friendId ? [friendId] : []}
        submitLabel={t('memory.new.submit')}
        loading={create.isPending}
        error={create.error}
        onSubmit={(values) =>
          create.mutate(values, {
            onSuccess: ({ id, photoError }) =>
              router.replace({ pathname: '/memory/[id]', params: photoError ? { id, photoError: '1' } : { id } }),
          })
        }
      />
    </Screen>
  );
}
