import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';

import { useUserId } from '@/lib/auth';
import { countryFlag, monthYear } from '@/lib/geo';
import { t } from '@/lib/i18n';
import { colors, fonts, radius } from '@/lib/theme';
import type { MapMember, SocialKey } from '@/lib/types';

import { Avatar } from './Avatar';
import { Button, Icon, T } from './ui';

export const SHEET_HEIGHT = 330;

type Props = {
  members: MapMember[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

/**
 * La card d'un membre, dans une bottom sheet. Swipe horizontal pour passer au suivant :
 * la sélection suit, et la carte recentre le pin correspondant.
 */
export function MemberSheet({ members, selectedId, onSelect }: Props) {
  const sheet = useRef<BottomSheet>(null);
  const list = useRef<FlatList<MapMember>>(null);
  const { width } = useWindowDimensions();
  const index = members.findIndex((m) => m.id === selectedId);

  useEffect(() => {
    if (index < 0) {
      sheet.current?.close();
      return;
    }
    sheet.current?.snapToIndex(0);
    list.current?.scrollToIndex({ index, animated: true });
  }, [index]);

  function onMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    const m = members[i];
    if (m && m.id !== selectedId) onSelect(m.id);
  }

  return (
    <BottomSheet
      ref={sheet}
      index={-1}
      snapPoints={[SHEET_HEIGHT]}
      enableDynamicSizing={false}
      enablePanDownToClose
      onClose={() => onSelect(null)}
      backgroundStyle={{ backgroundColor: colors.paper, borderRadius: radius.lg }}
      handleIndicatorStyle={{ backgroundColor: colors.line, width: 40 }}
    >
      <BottomSheetView style={{ flex: 1 }}>
        <FlatList
          ref={list}
          data={members}
          keyExtractor={(m) => m.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={Math.max(index, 0)}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={onMomentumEnd}
          renderItem={({ item }) => <MemberCard member={item} width={width} />}
        />
        {members.length > 1 ? (
          <View style={styles.dots}>
            {members.map((m, i) => (
              <View
                key={m.id}
                style={[styles.dot, i === index && { backgroundColor: colors.ink, width: 14 }]}
              />
            ))}
          </View>
        ) : null}
      </BottomSheetView>
    </BottomSheet>
  );
}

function MemberCard({ member, width }: { member: MapMember; width: number }) {
  const uid = useUserId();
  const since = monthYear(member.location_updated_at);
  const job = [member.job_title, member.company].filter(Boolean).join(' · ');
  const socials = socialLinks(member.socials);

  return (
    <View style={[styles.card, { width }]}>
      <View style={styles.header}>
        <Avatar name={member.display_name} url={member.avatar_url} color={member.pin_color} size={64} ring={3} />
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="title" style={{ fontSize: 24, lineHeight: 28 }} numberOfLines={1}>
            {member.display_name} {member.pin_emoji ?? ''}
          </T>
          <T style={{ fontFamily: fonts.medium, color: colors.inkSoft }} numberOfLines={1}>
            {countryFlag(member.country_code)} {member.city}
            {member.country ? `, ${member.country}` : ''}
          </T>
          {since ? <T variant="caption">{t('member.livesSince', { city: member.city ?? '', date: since })}</T> : null}
        </View>
      </View>

      {job ? (
        <View style={styles.line}>
          <Icon name="briefcase" size={15} color={colors.inkSoft} />
          <T style={{ fontFamily: fonts.medium, flex: 1 }} numberOfLines={1}>
            {job}
          </T>
        </View>
      ) : null}
      {member.bio ? (
        <T numberOfLines={3} style={{ color: colors.inkSoft }}>
          {member.bio}
        </T>
      ) : null}

      {member.id !== uid ? (
        <Button
          label={t('member.openCard')}
          kind="secondary"
          icon="user"
          onPress={() => router.push({ pathname: '/friend/[id]', params: { id: member.id } })}
          style={{ minHeight: 42 }}
        />
      ) : null}

      {socials.length > 0 ? (
        <View style={styles.socials}>
          {socials.map((s) => (
            <Pressable
              key={s.key}
              onPress={() => Linking.openURL(s.url)}
              style={({ pressed }) => [styles.social, { opacity: pressed ? 0.7 : 1 }]}
            >
              <T style={{ fontFamily: fonts.medium, fontSize: 14 }}>{SOCIALS[s.key].label}</T>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export const SOCIALS: Record<SocialKey, { label: string; placeholder: string; url: (v: string) => string }> = {
  instagram: { label: 'Instagram', placeholder: t('social.handle'), url: (v) => `https://instagram.com/${v.replace(/^@/, '')}` },
  linkedin: { label: 'LinkedIn', placeholder: t('social.handleOrUrl'), url: (v) => `https://www.linkedin.com/in/${v}` },
  x: { label: 'X', placeholder: t('social.handle'), url: (v) => `https://x.com/${v.replace(/^@/, '')}` },
  website: { label: t('social.website'), placeholder: t('social.sitePlaceholder'), url: (v) => `https://${v}` },
};

function socialLinks(socials: MapMember['socials']) {
  return (Object.keys(SOCIALS) as SocialKey[]).flatMap((key) => {
    const value = socials?.[key]?.trim();
    if (!value) return [];
    return [{ key, url: /^https?:\/\//.test(value) ? value : SOCIALS[key].url(value) }];
  });
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 24, paddingTop: 8, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  socials: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  social: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.muted },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 24 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00000022' },
});
