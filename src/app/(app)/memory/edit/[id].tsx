import { router, useLocalSearchParams } from 'expo-router';

import { MemoryForm } from '@/components/MemoryForm';
import { Loading, Screen } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useMemory, useUpdateMemory } from '@/lib/queries';

export default function EditMemory() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const memory = useMemory(id);
  const update = useUpdateMemory(id);

  if (memory.isPending || !memory.data) return <Loading />;

  return (
    <Screen scroll edges={['bottom']}>
      <MemoryForm
        initial={memory.data}
        submitLabel={t('common.save')}
        loading={update.isPending}
        error={update.error}
        onSubmit={({ groupId: _groupId, photos: _photos, ...values }) => update.mutate(values, { onSuccess: () => router.back() })}
      />
    </Screen>
  );
}
