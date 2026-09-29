import { router, useLocalSearchParams } from 'expo-router';

import { EmptyMemories, MemoryGrid } from '@/components/Memories';
import { Button, Screen } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useMemories } from '@/lib/queries';

/** Le scrapbook d'un groupe. */
export default function GroupMemories() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const memories = useMemories({ groupId: id });

  return (
    <Screen scroll>
      <Button
        label={t('memories.add')}
        onPress={() => router.push({ pathname: '/memory/new', params: { groupId: id } })}
      />
      {memories.isPending ? null : memories.data?.length ? (
        <MemoryGrid memories={memories.data} error={memories.error} />
      ) : (
        <EmptyMemories hint={t('memories.empty.group')} />
      )}
    </Screen>
  );
}
