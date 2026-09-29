import { Link } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { ErrorText, T } from '@/components/ui';
import { countryFlag } from '@/lib/geo';
import { daysUntilBirthday, formatDayMonth, t } from '@/lib/i18n';
import { useFriends } from '@/lib/queries';
import { colors, fonts, radius, shade, tint } from '@/lib/theme';
import type { Friend } from '@/lib/types';

function birthdayIn(f: Friend): number | null {
  return f.birthday_day && f.birthday_month ? daysUntilBirthday(f.birthday_day, f.birthday_month) : null;
}

export default function Friends() {
  const friends = useFriends();
  // Prochains anniversaires d'abord, puis les autres par ordre alphabétique.
  const sorted = [...(friends.data ?? [])].sort((a, b) => (birthdayIn(a) ?? 1000) - (birthdayIn(b) ?? 1000));

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <T variant="title">{t('friends.title')}</T>
      </View>
      <FlatList
        data={sorted}
        keyExtractor={(f) => f.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={friends.isRefetching} onRefresh={friends.refetch} />}
        ListHeaderComponent={<ErrorText error={friends.error} />}
        ListEmptyComponent={
          friends.isPending ? null : (
            <View style={styles.empty}>
              <T style={{ fontSize: 48 }}>💛</T>
              <T variant="heading" style={{ textAlign: 'center' }}>
                {t('friends.empty.title')}
              </T>
              <T style={{ textAlign: 'center', color: colors.inkSoft }}>{t('friends.empty.body')}</T>
            </View>
          )
        }
        renderItem={({ item }) => <FriendRow friend={item} />}
      />
    </SafeAreaView>
  );
}

function FriendRow({ friend }: { friend: Friend }) {
  const days = birthdayIn(friend);
  const soon = days !== null && days <= 30;

  return (
    <Link href={{ pathname: '/friend/[id]', params: { id: friend.id } }} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.row,
          soon && { backgroundColor: tint(friend.pin_color, 0.55) },
          { transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
      >
        <Avatar name={friend.display_name} url={friend.avatar_url} color={friend.pin_color} size={52} />
        <View style={{ flex: 1, gap: 2 }}>
          <T style={{ fontFamily: fonts.black, fontSize: 17 }} numberOfLines={1}>
            {friend.display_name} {friend.pin_emoji ?? ''}
          </T>
          {friend.city ? (
            <T variant="caption" numberOfLines={1}>
              {countryFlag(friend.country_code)} {friend.city}
            </T>
          ) : null}
        </View>
        {days !== null ? (
          <View style={{ alignItems: 'flex-end' }}>
            <T style={{ fontFamily: fonts.bold, color: shade(friend.pin_color, 0.55) }}>
              🎂 {formatDayMonth(friend.birthday_day!, friend.birthday_month!)}
            </T>
            {soon ? (
              <T variant="caption">
                {days === 0 ? t('friends.today') : days === 1 ? t('friends.tomorrow') : t('friends.inDays', { count: days })}
              </T>
            ) : null}
          </View>
        ) : null}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  list: { padding: 20, gap: 10, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, backgroundColor: colors.paper },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 40 },
});
