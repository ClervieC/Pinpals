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
import { useGroup, useGroupMap, useInvitableFriends, useMemories, useSignedUrls } from '@/lib/queries';
import type { MapMember } from '@/lib/types';
import { colors, fonts, radius, themed, tint } from '@/lib/theme';

/** Hauteur de la carte flottante du haut (titre + onglets), pour décaler la carte en dessous. */
const TOOLBAR_HEIGHT = 112;

export default function GroupMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const group = useGroup(id);
  const map = useGroupMap(id);
  const memories = useMemories({ groupId: id });
  const invitable = useInvitableFriends(id);
  const [layer, setLayer] = useState<MapLayer>('friends');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cluster, setCluster] = useState<MapMember[] | null>(null);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  // Incrémenté quand on ferme une fiche : la carte dézoome sur la vue d'ensemble.
  const [overviewKey, setOverviewKey] = useState(0);

  function selectMember(memberId: string | null) {
    if (!memberId && selectedId) setOverviewKey((k) => k + 1);
    setSelectedId(memberId);
  }
  function selectMemory(memoryId: string | null) {
    if (!memoryId && selectedMemoryId) setOverviewKey((k) => k + 1);
    setSelectedMemoryId(memoryId);
  }

  const memoryList = memories.data ?? [];
  // Seuls les souvenirs placés sur la carte défilent dans la fiche.
  const locatedList = memoryList.filter((m) => m.stops.length > 0);
  const selectedIndex = locatedList.findIndex((m) => m.id === selectedMemoryId);
  // Couvertures de toutes les vignettes + bandes de photos du souvenir ouvert et de ses voisins (swipe).
  const photoPaths = [
    ...new Set([
      ...locatedList.flatMap((m) => (m.cover_path ? [m.cover_path] : [])),
      ...(selectedIndex >= 0 ? locatedList.slice(Math.max(selectedIndex - 1, 0), selectedIndex + 2).flatMap((m) => m.photo_paths) : []),
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
          selectMember(memberId);
        }}
        onCluster={(list) => {
          setSelectedId(null);
          setCluster(list);
        }}
        memories={mapMemories}
        selectedMemoryId={selectedMemoryId}
        onSelectMemory={selectMemory}
        overviewKey={overviewKey}
        topInset={insets.top + 16 + TOOLBAR_HEIGHT}
        bottomInset={selectedId || selectedMemoryId ? SHEET_HEIGHT : 0}
      />

      {/* Une seule carte flottante : titre du groupe, actions, puis choix du calque. */}
      <View style={[styles.toolbarWrap, { top: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.toolbar}>
          <View style={styles.row}>
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              accessibilityLabel={t('common.back')}
              style={({ pressed }) => [styles.round, pressed && { opacity: 0.7 }]}
            >
              <Icon name="chevron-left" size={22} />
            </Pressable>
            <View style={[styles.emojiTile, { backgroundColor: tint(g.color, 0.65) }]}>
              <T style={{ fontSize: 20 }}>{g.emoji}</T>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T style={{ fontFamily: fonts.display, fontSize: 17 }} numberOfLines={1}>
                {g.name}
              </T>
              <View
                style={styles.meta}
                accessible
                accessibilityLabel={`${t('group.onMap', { count: members.length })} · ${tn('common.members', g.member_count)}`}
              >
                <Icon name="map-pin" size={12} color={colors.inkSoft} />
                <T variant="caption">{members.length}</T>
                <T variant="caption">·</T>
                <Icon name="users" size={12} color={colors.inkSoft} />
                <T variant="caption">{g.member_count}</T>
              </View>
            </View>
            <Link href={{ pathname: '/group/[id]/memories', params: { id } }} asChild>
              <Pressable style={styles.round} accessibilityLabel={t('memories.groupTitle')}>
                <Icon name="book-open" size={18} />
              </Pressable>
            </Link>
            <Link href={{ pathname: '/group/[id]/settings', params: { id } }} asChild>
              <Pressable style={styles.round} accessibilityLabel={t('settings.title')}>
                <Icon name="settings" size={18} />
              </Pressable>
            </Link>
          </View>

          {/* Calque : ami·es ou souvenirs. */}
          <View style={styles.layers}>
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
        </View>
      </View>

      {layer === 'friends' && alone ? (
        <Animated.View entering={FadeInDown.delay(600).springify()} style={[styles.empty, { bottom: insets.bottom + 20 }]}>
          <T variant="heading">{t('group.alone.title')}</T>
          <T style={{ color: colors.inkSoft }}>{t('group.alone.body')}</T>
          <InviteButton group={g} label={t('group.alone.cta')} />
          {invitable.data?.length ? (
            <Button
              label={t('invite.friends.cta')}
              kind="secondary"
              icon="user-plus"
              onPress={() => router.push({ pathname: '/group/[id]/settings', params: { id } })}
            />
          ) : null}
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

      {layer === 'friends' ? <MemberSheet members={members} selectedId={selectedId} onSelect={selectMember} /> : null}
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
      {layer === 'memories' && selectedMemoryId && selectedIndex >= 0 ? (
        <MemoryPreview
          memories={locatedList}
          selectedId={selectedMemoryId}
          onSelect={selectMemory}
          photoUrls={urls.data}
          bottomInset={insets.bottom}
          onClose={() => selectMemory(null)}
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

const styles = themed(() =>
  StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.cream },
    toolbarWrap: { position: 'absolute', left: 12, right: 12, alignItems: 'center' },
    toolbar: {
      width: '100%',
      maxWidth: 560,
      height: TOOLBAR_HEIGHT,
      padding: 8,
      gap: 8,
      borderRadius: 24,
      backgroundColor: colors.paper,
      ...shadow,
    },
    row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    round: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    layers: { flexDirection: 'row', padding: 3, gap: 3, borderRadius: radius.pill, backgroundColor: colors.muted },
    layer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 34,
      borderRadius: radius.pill,
    },
    layerOn: { backgroundColor: colors.accent },
    layerText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft },
    emojiTile: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
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
  }),
);
