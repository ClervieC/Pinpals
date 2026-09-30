import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CitySheet } from '@/components/CitySheet';
import { InviteButton } from '@/components/InviteButton';
import { GroupMap } from '@/components/map/GroupMap';
import type { MapLayer, MapMemory } from '@/components/map/types';
import { colorFor } from '@/components/Memories';
import { MemberSheet, SHEET_HEIGHT } from '@/components/MemberSheet';
import { MemoryPreview } from '@/components/MemoryPreview';
import { Button, ErrorText, Icon, Loading, T } from '@/components/ui';
import { t, tn } from '@/lib/i18n';
import { useGroup, useGroupMap, useMemories, useSignedUrls } from '@/lib/queries';
import type { MapMember } from '@/lib/types';
import { colors, fonts, radius, tint } from '@/lib/theme';

const HEADER_HEIGHT = 64;
const LAYER_HEIGHT = 52;

export default function GroupMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const group = useGroup(id);
  const map = useGroupMap(id);
  const memories = useMemories({ groupId: id });
  const [layer, setLayer] = useState<MapLayer>('friends');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cluster, setCluster] = useState<MapMember[] | null>(null);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);

  const memoryList = memories.data ?? [];
  const selectedMemory = memoryList.find((m) => m.id === selectedMemoryId) ?? null;
  // Couvertures de toutes les vignettes + bande de photos du souvenir ouvert.
  const photoPaths = [
    ...new Set([
      ...memoryList.flatMap((m) => (m.cover_path && m.stops.length ? [m.cover_path] : [])),
      ...(selectedMemory?.photo_paths ?? []),
    ]),
  ];
  const urls = useSignedUrls(layer === 'memories' ? photoPaths : []);
  const mapMemories: MapMemory[] = memoryList.map((m) => ({
    id: m.id,
    kind: m.kind,
    title: m.title,
    color: colorFor(m.id),
    coverUrl: m.cover_path ? urls.data?.[m.cover_path] : undefined,
    stops: m.stops,
  }));
  const located = mapMemories.filter((m) => m.stops.length > 0);

  function switchLayer(next: MapLayer) {
    setLayer(next);
    setSelectedId(null);
    setCluster(null);
    setSelectedMemoryId(null);
  }

  if (group.isPending || map.isPending) return <Loading />;
  if (!group.data) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <T variant="heading">{t('group.notFound')}</T>
        <ErrorText error={group.error ?? map.error} />
      </View>
    );
  }

  const g = group.data;
  const members = map.data ?? [];
  const alone = g.member_count <= 1;

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <GroupMap
        layer={layer}
        members={members}
        selectedId={selectedId}
        onSelect={(memberId) => {
          setCluster(null);
          setSelectedId(memberId);
        }}
        onCluster={(list) => {
          setSelectedId(null);
          setCluster(list);
        }}
        memories={mapMemories}
        selectedMemoryId={selectedMemoryId}
        onSelectMemory={setSelectedMemoryId}
        topInset={insets.top + HEADER_HEIGHT + LAYER_HEIGHT}
        bottomInset={selectedId || selectedMemoryId ? SHEET_HEIGHT : 0}
      />

      {/* Header flottant au-dessus de la carte. */}
      <View style={[styles.header, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.round}>
          <Icon name="chevron-left" size={22} />
        </Pressable>
        <View style={styles.title}>
          <View style={[styles.emojiTile, { backgroundColor: tint(g.color, 0.7) }]}>
            <T style={{ fontSize: 18 }}>{g.emoji}</T>
          </View>
          <View style={{ flexShrink: 1 }}>
            <T style={{ fontFamily: fonts.display, fontSize: 16 }} numberOfLines={1}>
              {g.name}
            </T>
            <T style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft }}>
              {t('group.onMap', { count: members.length })} · {tn('common.members', g.member_count)}
            </T>
          </View>
        </View>
        <Link href={{ pathname: '/group/[id]/memories', params: { id } }} asChild>
          <Pressable style={styles.round} accessibilityLabel={t('memories.groupTitle')}>
            <Icon name="book-open" size={19} />
          </Pressable>
        </Link>
        <Link href={{ pathname: '/group/[id]/settings', params: { id } }} asChild>
          <Pressable style={styles.round} accessibilityLabel={t('settings.title')}>
            <Icon name="settings" size={19} />
          </Pressable>
        </Link>
      </View>

      {/* Calque : ami·es ou souvenirs. */}
      <View style={[styles.layers, { top: insets.top + HEADER_HEIGHT + 4 }]}>
        {(['friends', 'memories'] as const).map((l) => (
          <Pressable
            key={l}
            onPress={() => switchLayer(l)}
            accessibilityRole="button"
            accessibilityState={{ selected: layer === l }}
            style={[styles.layer, layer === l && styles.layerOn]}
          >
            <Icon name={l === 'friends' ? 'users' : 'camera'} size={15} color={layer === l ? colors.onAccent : colors.inkSoft} />
            <T style={[styles.layerText, layer === l && { color: colors.onAccent }]}>
              {l === 'friends' ? t('map.layer.friends') : t('map.layer.memories')}
            </T>
          </Pressable>
        ))}
      </View>

      {layer === 'friends' && alone ? (
        <Animated.View entering={FadeInDown.delay(600).springify()} style={[styles.empty, { bottom: insets.bottom + 20 }]}>
          <T variant="heading">{t('group.alone.title')}</T>
          <T style={{ color: colors.inkSoft }}>{t('group.alone.body')}</T>
          <InviteButton group={g} label={t('group.alone.cta')} />
        </Animated.View>
      ) : null}

      {layer === 'memories' && !memories.isPending && located.length === 0 ? (
        <Animated.View entering={FadeInDown.springify()} style={[styles.empty, { bottom: insets.bottom + 20 }]}>
          <T variant="heading">{t('map.memoriesEmpty.title')}</T>
          <T style={{ color: colors.inkSoft }}>{t('map.memoriesEmpty.body')}</T>
          <Button
            label={t('memories.add')}
            icon="plus"
            onPress={() => router.push({ pathname: '/memory/new', params: { groupId: id } })}
          />
        </Animated.View>
      ) : null}

      {layer === 'friends' ? <MemberSheet members={members} selectedId={selectedId} onSelect={setSelectedId} /> : null}
      {layer === 'friends' && cluster ? (
        <CitySheet
          members={cluster}
          bottomInset={insets.bottom}
          onClose={() => setCluster(null)}
          onPick={(memberId) => {
            setCluster(null);
            setSelectedId(memberId);
          }}
        />
      ) : null}
      {layer === 'memories' && selectedMemory ? (
        <MemoryPreview
          memory={selectedMemory}
          photoUrls={urls.data}
          bottomInset={insets.bottom}
          onClose={() => setSelectedMemoryId(null)}
        />
      ) : null}
    </View>
  );
}

const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.cream },
  header: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  title: {
    flex: 1,
    height: HEADER_HEIGHT - 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 8,
    paddingRight: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    ...shadow,
  },
  layers: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    ...shadow,
  },
  layer: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: radius.pill },
  layerOn: { backgroundColor: colors.accent },
  layerText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft },
  emojiTile: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  empty: {
    position: 'absolute',
    left: 16,
    right: 16,
    padding: 20,
    gap: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.paper,
    ...shadow,
  },
});
