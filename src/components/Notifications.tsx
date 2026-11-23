import { type Href, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { birthdayIn, countdown, upcomingBirthdays } from '@/lib/birthdays';
import { countryFlag } from '@/lib/geo';
import { formatDayMonth, t, timeAgo, tn } from '@/lib/i18n';
import { useFriends, useMyInvitations, useUnreadNotifications } from '@/lib/queries';
import { colors, fonts, radius, shade, themed, tint } from '@/lib/theme';
import type { AppNotification, Friend, NotificationKind } from '@/lib/types';

import { Avatar } from './Avatar';
import { Chip } from './Tiles';
import { Icon, type IconName, SectionCard, T } from './ui';

/** Rappels d'anniversaire : sur l'accueil, la semaine qui vient. */
export const REMINDER_DAYS = 7;

/** Cloche de l'accueil, avec le nombre de nouveautés (notifications non lues + invitations). */
export function BellButton() {
  const unread = useUnreadNotifications();
  const invitations = useMyInvitations();
  const count = (unread.data ?? 0) + (invitations.data?.length ?? 0);
  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      accessibilityRole="button"
      accessibilityLabel={count ? `${t('notifications.open')} (${count})` : t('notifications.open')}
      hitSlop={6}
      style={({ pressed }) => [styles.bell, pressed && { opacity: 0.7 }]}
    >
      <Icon name="bell" size={20} />
      {count ? (
        <View style={styles.badge}>
          <T style={styles.badgeText}>{count > 9 ? '9+' : count}</T>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * Ce qu'on voit en ouvrant l'app : les anniversaires de la semaine et les nouvelles notifications.
 * Rien ne s'affiche s'il n'y a rien à rappeler.
 */
export function RemindersCard() {
  const friends = useFriends();
  const unread = useUnreadNotifications();
  const birthdays = upcomingBirthdays(friends.data ?? [], REMINDER_DAYS);
  const count = unread.data ?? 0;
  if (!birthdays.length && !count) return null;

  return (
    <SectionCard icon="bell" title={t('notifications.reminders')} style={{ alignSelf: 'stretch' }}>
      {birthdays.map((f, i) => (
        <BirthdayRow key={f.id} friend={f} divider={i > 0} />
      ))}
      {count ? (
        <Pressable
          onPress={() => router.push('/notifications')}
          accessibilityRole="link"
          style={({ pressed }) => [styles.row, birthdays.length > 0 && styles.divider, pressed && { opacity: 0.7 }]}
        >
          <View style={[styles.iconTile, { backgroundColor: tint(colors.accent, 0.85) }]}>
            <Icon name="bell" size={20} color={shade(colors.accent, 0.3)} />
          </View>
          <T style={styles.rowText}>{tn('notifications.unread', count)}</T>
          <Icon name="chevron-right" size={18} color={colors.inkSoft} />
        </Pressable>
      ) : null}
    </SectionCard>
  );
}

export function BirthdayRow({ friend, divider }: { friend: Friend; divider?: boolean }) {
  const days = birthdayIn(friend) ?? 0;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/friend/[id]', params: { id: friend.id } })}
      accessibilityRole="link"
      style={({ pressed }) => [styles.row, divider && styles.divider, pressed && { opacity: 0.7 }]}
    >
      <Avatar name={friend.display_name} url={friend.avatar_url} color={friend.pin_color} size={44} />
      <View style={{ flex: 1, gap: 4 }}>
        <T style={{ fontFamily: fonts.semibold }} numberOfLines={1}>
          {t('notifications.birthday', { name: friend.display_name })} {days === 0 ? '🎂' : ''}
        </T>
        <View style={{ flexDirection: 'row' }}>
          <Chip
            icon="gift"
            label={`${countdown(days)} · ${formatDayMonth(friend.birthday_day!, friend.birthday_month!)}`}
            tone={days === 0 ? 'accent' : undefined}
          />
        </View>
      </View>
      <Icon name="chevron-right" size={18} color={colors.inkSoft} />
    </Pressable>
  );
}

const KIND_ICON: Record<NotificationKind, IconName> = {
  memory_comment: 'message-circle',
  photo_comment: 'message-circle',
  photo_like: 'heart',
  tagged: 'tag',
  group_memory: 'camera',
  member_joined: 'user-plus',
  moved: 'map-pin',
};

function notificationText(n: AppNotification): string {
  const city = n.data.city ? `${countryFlag(n.data.country_code ?? null)} ${n.data.city}` : '';
  return t(`notifications.kind.${n.kind}`, {
    name: n.actor_name,
    title: n.memory_title ?? '',
    group: n.group_name ? `${n.group_emoji ?? ''} ${n.group_name}`.trim() : '',
    city,
  });
}

function notificationHref(n: AppNotification): Href {
  if (n.memory_id) return { pathname: '/memory/[id]', params: { id: n.memory_id } };
  if (n.kind === 'member_joined' && n.group_id) return { pathname: '/group/[id]', params: { id: n.group_id } };
  return { pathname: '/friend/[id]', params: { id: n.actor_id } };
}

export function NotificationRow({ notification: n, fresh, divider }: { notification: AppNotification; fresh: boolean; divider: boolean }) {
  return (
    <Pressable
      onPress={() => router.push(notificationHref(n))}
      accessibilityRole="link"
      style={({ pressed }) => [styles.row, divider && styles.divider, pressed && { opacity: 0.7 }]}
    >
      <View>
        <Avatar name={n.actor_name} url={n.actor_avatar_url} color={n.actor_color} size={44} />
        <View style={[styles.kind, { backgroundColor: tint(colors.accent, 0.85) }]}>
          <Icon name={KIND_ICON[n.kind]} size={11} color={shade(colors.accent, 0.3)} />
        </View>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T style={fresh ? { fontFamily: fonts.semibold } : undefined} numberOfLines={3}>
          {notificationText(n)}
        </T>
        <T variant="caption">{timeAgo(n.created_at)}</T>
      </View>
      {fresh ? <View style={styles.dot} accessibilityLabel={t('notifications.new')} /> : null}
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    bell: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.paper,
      borderWidth: 1,
      borderColor: colors.line,
    },
    badge: {
      position: 'absolute',
      top: -3,
      right: -3,
      minWidth: 20,
      height: 20,
      paddingHorizontal: 5,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      borderWidth: 2,
      borderColor: colors.cream,
    },
    badgeText: { color: colors.onAccent, fontFamily: fonts.bold, fontSize: 10, lineHeight: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    rowText: { flex: 1, fontFamily: fonts.semibold },
    divider: { borderTopWidth: 1, borderTopColor: colors.line },
    iconTile: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    kind: {
      position: 'absolute',
      right: -4,
      bottom: -4,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.paper,
    },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  }),
);
