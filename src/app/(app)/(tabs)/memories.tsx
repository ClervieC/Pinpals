import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyMemories, MemoryGrid } from '@/components/Memories';
import { Button, T } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useMemories } from '@/lib/queries';
import { colors, fonts, radius } from '@/lib/theme';
import type { MemoryKind } from '@/lib/types';

export default function MemoriesTab() {
  const memories = useMemories();
  const [kind, setKind] = useState<MemoryKind | 'all'>('all');
  const shown = (memories.data ?? []).filter((m) => kind === 'all' || m.kind === kind);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={memories.isRefetching} onRefresh={memories.refetch} />}
      >
        <T variant="title">{t('memories.title')}</T>
        <View style={styles.filters}>
          {(['all', 'memory', 'trip'] as const).map((k) => (
            <Pressable key={k} onPress={() => setKind(k)} style={[styles.filter, kind === k && styles.filterOn]}>
              <T style={{ fontFamily: fonts.bold, fontSize: 14 }}>
                {k === 'all' ? t('memories.filter.all') : k === 'trip' ? t('memory.kind.trip') : t('memory.kind.memory')}
              </T>
            </Pressable>
          ))}
        </View>
        <Button label={t('memories.add')} onPress={() => router.push('/memory/new')} />
        {memories.isPending ? null : shown.length ? (
          <MemoryGrid memories={shown} error={memories.error} />
        ) : (
          <EmptyMemories />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, gap: 16 },
  filters: { flexDirection: 'row', gap: 8 },
  filter: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.paper },
  filterOn: { backgroundColor: colors.ink + '18' },
});
