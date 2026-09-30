import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { countryFlag } from '@/lib/geo';
import { t } from '@/lib/i18n';
import { colors, fonts, radius } from '@/lib/theme';
import type { MapMember } from '@/lib/types';

import { Avatar } from './Avatar';
import { Icon, T } from './ui';

type Props = {
  members: MapMember[];
  onPick: (id: string) => void;
  onClose: () => void;
  bottomInset: number;
};

/**
 * Fiche d'une pile de pins : tous les ami·es regroupé·es au même endroit, en liste.
 * Marche même quand le zoom maximal ne suffit pas à séparer les pins (même ville).
 */
export function CitySheet({ members, onPick, onClose, bottomInset }: Props) {
  const { height } = useWindowDimensions();
  const cities = [...new Set(members.map((m) => m.city).filter(Boolean))];
  const sameCity = cities.length === 1;
  const first = members[0];

  return (
    <View style={[styles.sheet, { paddingBottom: bottomInset + 16, maxHeight: height * 0.6 }]}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="label">
            {sameCity && first
              ? `${countryFlag(first.country_code)} ${first.city}${first.country ? `, ${first.country}` : ''}`
              : cities.join(' · ')}
          </T>
          <T variant="title" style={{ fontSize: 26, lineHeight: 30 }}>
            {sameCity ? t('city.here', { count: members.length }) : t('city.around', { count: members.length })}
          </T>
        </View>
        <Pressable onPress={onClose} accessibilityLabel={t('common.close')} hitSlop={8} style={styles.close}>
          <Icon name="x" size={16} />
        </Pressable>
      </View>
      <ScrollView>
        {members.map((m, i) => (
          <Pressable key={m.id} onPress={() => onPick(m.id)} style={[styles.row, i > 0 && styles.divider]}>
            <Avatar name={m.display_name} url={m.avatar_url} color={m.pin_color} size={44} />
            <View style={{ flex: 1, gap: 2 }}>
              <T style={{ fontFamily: fonts.semibold }}>
                {m.display_name} {m.pin_emoji ?? ''}
              </T>
              <T variant="caption" numberOfLines={1}>
                {sameCity
                  ? [m.job_title, m.company].filter(Boolean).join(' · ') || t('city.seeCard')
                  : `${countryFlag(m.country_code)} ${m.city}`}
              </T>
            </View>
            <Icon name="chevron-right" size={18} color={colors.inkSoft} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 10,
    paddingHorizontal: 20,
    gap: 12,
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
});
