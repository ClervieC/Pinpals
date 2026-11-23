import { router } from 'expo-router';
import { useState } from 'react';

import { EmptyMemories, FeaturedMemory, MemoryGrid } from '@/components/Memories';
import { Button, PageHeader, Screen, Segmented } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useMemoriesPaged } from '@/lib/queries';
import type { MemoryKind } from '@/lib/types';

export default function MemoriesTab() {
  const memories = useMemoriesPaged();
  const [kind, setKind] = useState<MemoryKind | 'all'>('all');
  // Filtre appliqué aux pages déjà chargées ; « Voir plus » charge la suite.
  const shown = memories.items.filter((m) => kind === 'all' || m.kind === kind);
  const add = () => router.push('/memory/new');

  return (
    <Screen scroll edges={['top']} refreshing={memories.isRefetching} onRefresh={memories.refetch}>
      <PageHeader eyebrow={t('memories.eyebrow')} title={t('memories.title')} />
      <Segmented
        options={[
          { value: 'all', label: t('memories.filter.all') },
          { value: 'memory', label: t('memory.kind.memory') },
          { value: 'trip', label: t('memory.kind.trip') },
        ]}
        value={kind}
        onChange={setKind}
      />
      {memories.isPending ? null : shown.length ? (
        <>
          <FeaturedMemory memory={shown[0]} />
          <MemoryGrid memories={shown.slice(1)} error={memories.error} onAdd={add} />
          {memories.hasNextPage ? (
            <Button
              label={t('memories.more')}
              kind="secondary"
              icon="chevron-down"
              loading={memories.isFetchingNextPage}
              onPress={() => memories.fetchNextPage()}
            />
          ) : null}
        </>
      ) : (
        <>
          <EmptyMemories />
          <Button label={t('memories.add')} icon="plus" onPress={add} />
          {memories.hasNextPage ? (
            <Button
              label={t('memories.more')}
              kind="secondary"
              icon="chevron-down"
              loading={memories.isFetchingNextPage}
              onPress={() => memories.fetchNextPage()}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}
