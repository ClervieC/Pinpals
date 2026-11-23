import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EmptyMemories } from '@/components/Memories';
import { MemoryTimeline } from '@/components/MemoryTimeline';
import { Button, ErrorText, Screen, T } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useGroup, useMemories } from '@/lib/queries';
import { themed, tint } from '@/lib/theme';

/** Le scrapbook d'un groupe. */
export default function GroupMemories() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useGroup(id);
  const memories = useMemories({ groupId: id });
  const add = () => router.push({ pathname: '/memory/new', params: { groupId: id } });
  const g = group.data;
  const hasMemories = !!memories.data?.length;

  return (
    <Screen scroll edges={['bottom']} accent={g?.color}>
      <Stack.Screen options={{ title: '' }} />

      <View style={styles.header}>
        {g ? (
          <View style={[styles.badge, { backgroundColor: tint(g.color, 0.6) }]}>
            <T style={{ fontSize: 26 }}>{g.emoji}</T>
          </View>
        ) : null}
        <View style={{ flex: 1, gap: 2 }}>
          {g ? (
            <T variant="label" numberOfLines={1}>
              {g.name}
            </T>
          ) : null}
          <T variant="title">{t('memories.timelineTitle')}</T>
        </View>
        {hasMemories ? <Button label={t('memories.addShort')} icon="plus" onPress={add} style={{ minHeight: 40 }} /> : null}
      </View>

      <ErrorText error={memories.error} />
      {memories.isPending ? null : hasMemories ? (
        <MemoryTimeline memories={memories.data!} />
      ) : (
        <>
          <EmptyMemories hint={t('memories.empty.group')} />
          <Button label={t('memories.add')} icon="plus" onPress={add} />
        </>
      )}
    </Screen>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    badge: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  }),
);
