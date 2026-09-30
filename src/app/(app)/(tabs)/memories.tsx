import { router } from 'expo-router';
import { useState } from 'react';

import { EmptyMemories, FeaturedMemory, MemoryGrid } from '@/components/Memories';
import { Button, PageHeader, Screen, Segmented } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useMemories } from '@/lib/queries';
import type { MemoryKind } from '@/lib/types';

export default function MemoriesTab() {
  const memories = useMemories();
  const [kind, setKind] = useState<MemoryKind | 'all'>('all');
  const shown = (memories.data ?? []).filter((m) => kind === 'all' || m.kind === kind);
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
        </>
      ) : (
        <>
          <EmptyMemories />
          <Button label={t('memories.add')} icon="plus" onPress={add} />
        </>
      )}
    </Screen>
  );
}
