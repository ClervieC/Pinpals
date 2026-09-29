import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InviteButton } from '@/components/InviteButton';
import { GroupMap } from '@/components/map/GroupMap';
import { MemberSheet, SHEET_HEIGHT } from '@/components/MemberSheet';
import { ErrorText, Loading, T } from '@/components/ui';
import { t, tn } from '@/lib/i18n';
import { useGroup, useGroupMap } from '@/lib/queries';
import { colors, fonts, radius, shade, tint } from '@/lib/theme';

const HEADER_HEIGHT = 64;

export default function GroupMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const group = useGroup(id);
  const map = useGroupMap(id);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
        members={members}
        selectedId={selectedId}
        onSelect={setSelectedId}
        topInset={insets.top + HEADER_HEIGHT}
        bottomInset={selectedId ? SHEET_HEIGHT : 0}
      />

      {/* Header flottant, teinté de la couleur du groupe. */}
      <View style={[styles.header, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.round}>
          <T style={styles.icon}>‹</T>
        </Pressable>
        <View style={[styles.title, { backgroundColor: tint(g.color, 0.3) }]}>
          <T style={{ fontSize: 20 }}>{g.emoji}</T>
          <View style={{ flexShrink: 1 }}>
            <T style={{ fontFamily: fonts.black, fontSize: 16 }} numberOfLines={1}>
              {g.name}
            </T>
            <T style={{ fontFamily: fonts.bold, fontSize: 12, color: shade(g.color, 0.55) }}>
              {t('group.onMap', { count: members.length })} · {tn('common.members', g.member_count)}
            </T>
          </View>
        </View>
        <Link href={{ pathname: '/group/[id]/memories', params: { id } }} asChild>
          <Pressable style={styles.round} accessibilityLabel={t('memories.groupTitle')}>
            <T style={{ fontSize: 18 }}>📔</T>
          </Pressable>
        </Link>
        <Link href={{ pathname: '/group/[id]/settings', params: { id } }} asChild>
          <Pressable style={styles.round} accessibilityLabel={t('settings.title')}>
            <T style={{ fontSize: 18 }}>⚙️</T>
          </Pressable>
        </Link>
      </View>

      {alone ? (
        <Animated.View entering={FadeInDown.delay(600).springify()} style={[styles.empty, { bottom: insets.bottom + 20 }]}>
          <T variant="heading">{t('group.alone.title')}</T>
          <T style={{ color: colors.inkSoft }}>{t('group.alone.body')}</T>
          <InviteButton group={g} label={t('group.alone.cta')} />
        </Animated.View>
      ) : null}

      <MemberSheet members={members} selectedId={selectedId} onSelect={setSelectedId} />
    </View>
  );
}

const shadow = {
  shadowColor: '#5E5169',
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.cream },
  header: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  round: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  icon: { fontSize: 30, lineHeight: 32, fontFamily: fonts.bold, marginTop: -2 },
  title: {
    flex: 1,
    height: HEADER_HEIGHT - 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    ...shadow,
  },
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
