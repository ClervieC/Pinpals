import { router, Stack, useLocalSearchParams } from 'expo-router';

import { EmptyMemories } from '@/components/Memories';
import { MemoryTimeline } from '@/components/MemoryTimeline';
import { Button, ErrorText, PageHeader, Screen } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useGroup, useMemories } from '@/lib/queries';

/** Le scrapbook d'un groupe. */
export default function GroupMemories() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useGroup(id);
  const memories = useMemories({ groupId: id });
  const add = () => router.push({ pathname: '/memory/new', params: { groupId: id } });

  return (
    <Screen scroll edges={['bottom']}>
      <Stack.Screen options={{ title: '' }} />
      <PageHeader
        eyebrow={group.data ? `${group.data.emoji} ${group.data.name}` : null}
        title={t('memories.timelineTitle')}
      />
      {memories.isPending ? null : memories.data?.length ? (
        <>
          <Button label={t('memories.add')} icon="plus" onPress={add} />
          <ErrorText error={memories.error} />
          <MemoryTimeline memories={memories.data} />
        </>
      ) : (
        <>
          <EmptyMemories hint={t('memories.empty.group')} />
          <Button label={t('memories.add')} icon="plus" onPress={add} />
        </>
      )}
    </Screen>
  );
}
