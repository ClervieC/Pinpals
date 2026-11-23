import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';

import { useUserId } from '@/lib/auth';
import { countryFlag, monthYear } from '@/lib/geo';
import { t } from '@/lib/i18n';
import { colors, radius, shade, themed, tint } from '@/lib/theme';
import type { MapMember, SocialKey } from '@/lib/types';

import { Avatar } from './Avatar';
import { Chip } from './Tiles';
import { Button, cardShadow, Icon, type IconName, T } from './ui';

export const SHEET_HEIGHT = 340;
/** Sur grand écran, la fiche ne s'étire pas : largeur max, centrée. */
const MAX_WIDTH = 560;

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
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.min(screenWidth, MAX_WIDTH);
  const side = (screenWidth - width) / 2;
  const index = members.findIndex((m) => m.id === selectedId);

  useEffect(() => {
    if (index < 0) {
      sheet.current?.close();
      return;
    }
    sheet.current?.snapToIndex(0);
    list.current?.scrollToIndex({ index, animated: true });
  }, [index]);

  // Fin de swipe détectée par un court délai sans défilement : react-native-web n'émet pas
  // onMomentumScrollEnd, donc on ne peut pas s'appuyer dessus pour suivre la fiche affichée.
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(settle.current ?? undefined), []);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    clearTimeout(settle.current ?? undefined);
    settle.current = setTimeout(() => {
      const m = members[Math.round(x / width)];
      if (m && m.id !== selectedId) onSelect(m.id);
    }, 140);
  }

  return (
    <BottomSheet
      ref={sheet}
      index={-1}
      snapPoints={[SHEET_HEIGHT]}
      enableDynamicSizing={false}
      enablePanDownToClose
      onClose={() => onSelect(null)}
      style={[{ marginHorizontal: side }, { ...cardShadow }]}
      backgroundStyle={{ backgroundColor: colors.paper, borderRadius: 28 }}
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
          onScroll={onScroll}
          scrollEventThrottle={32}
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
  const color = member.pin_color;
  const isMe = member.id === uid;

  return (
    <View style={[styles.card, { width }]}>
      {/* Bandeau à la couleur du pin, comme les cartes de groupe. */}
      <View style={[styles.band, { backgroundColor: tint(color, 0.6) }]}>
        <View style={[styles.deco, { top: 12, right: 24 }]}>
          <Icon name="map-pin" size={16} color={shade(color, 0.1)} />
        </View>
        <View style={[styles.deco, { top: 34, right: 62 }]}>
          <Icon name="map-pin" size={12} color={color} />
        </View>
      </View>

      <View style={styles.header}>
        <View style={styles.avatar}>
          <Avatar name={member.display_name} url={member.avatar_url} color={color} size={76} ring={3} />
        </View>
        <View style={{ flex: 1, gap: 2, paddingBottom: 2 }}>
          <T variant="title" style={{ fontSize: 24, lineHeight: 28 }} numberOfLines={1}>
            {member.display_name} {member.pin_emoji ?? ''}
          </T>
          {job ? (
            <View style={styles.line}>
              <Icon name="briefcase" size={13} color={colors.inkSoft} />
              <T variant="caption" style={{ flex: 1 }} numberOfLines={1}>
                {job}
              </T>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.chips}>
        {member.city ? (
          <Chip label={`${countryFlag(member.country_code)} ${member.city}${member.country ? `, ${member.country}` : ''}`} />
        ) : null}
        {since ? <Chip icon="calendar" label={t('member.since', { date: since })} /> : null}
      </View>

      {member.bio ? (
        <T numberOfLines={2} style={{ color: colors.inkSoft }}>
          {member.bio}
        </T>
      ) : null}

      <View style={styles.actions}>
        {isMe ? (
          <Chip icon="smile" label={t('member.you')} tone="accent" />
        ) : (
          <Button
            label={t('member.openCard')}
            icon="user"
            onPress={() => router.push({ pathname: '/friend/[id]', params: { id: member.id } })}
            style={{ flex: 1, minHeight: 44 }}
          />
        )}
        {socials.map((s) => (
          <Pressable
            key={s.key}
            accessibilityLabel={SOCIALS[s.key].label}
            onPress={() => Linking.openURL(s.url)}
            style={({ pressed }) => [styles.social, { backgroundColor: tint(color, 0.8), opacity: pressed ? 0.7 : 1 }]}
          >
            <Icon name={SOCIAL_ICONS[s.key]} size={18} color={shade(color, 0.45)} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const SOCIAL_ICONS: Record<SocialKey, IconName> = {
  instagram: 'instagram',
  linkedin: 'linkedin',
  x: 'twitter',
  website: 'globe',
};

export const SOCIALS: Record<SocialKey, { label: string; placeholder: string; url: (v: string) => string }> = {
  // Getters : les textes suivent la langue choisie au lieu d'être figés au chargement du module.
  instagram: { label: 'Instagram', get placeholder() { return t('social.handle'); }, url: (v) => `https://instagram.com/${v.replace(/^@/, '')}` },
  linkedin: { label: 'LinkedIn', get placeholder() { return t('social.handleOrUrl'); }, url: (v) => `https://www.linkedin.com/in/${v}` },
  x: { label: 'X', get placeholder() { return t('social.handle'); }, url: (v) => `https://x.com/${v.replace(/^@/, '')}` },
  website: { get label() { return t('social.website'); }, get placeholder() { return t('social.sitePlaceholder'); }, url: (v) => `https://${v}` },
};

function socialLinks(socials: MapMember['socials']) {
  return (Object.keys(SOCIALS) as SocialKey[]).flatMap((key) => {
    const value = socials?.[key]?.trim();
    if (!value) return [];
    return [{ key, url: /^https?:\/\//.test(value) ? value : SOCIALS[key].url(value) }];
  });
}

const styles = themed(() =>
  StyleSheet.create({
    card: { paddingHorizontal: 16, gap: 12 },
    band: { height: 64, borderRadius: 20, overflow: 'hidden' },
    deco: { position: 'absolute' },
    header: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, paddingHorizontal: 12, marginTop: -44 },
    avatar: { borderRadius: 44, borderWidth: 4, borderColor: colors.paper, backgroundColor: colors.paper },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 'auto' },
    social: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
    line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 14 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.line },
  }),
);
