import { Avatar } from '@/components/Avatar';
import { Chip, ColorCard, Grid } from '@/components/Tiles';
import { EmptyState, ErrorText, PageHeader, Screen, SectionTitle } from '@/components/ui';
import { countryFlag } from '@/lib/geo';
import { daysUntilBirthday, formatDayMonth, t } from '@/lib/i18n';
import { useFriends } from '@/lib/queries';
import { pastels } from '@/lib/theme';
import type { Friend } from '@/lib/types';

const SOON_DAYS = 30;

function birthdayIn(f: Friend): number | null {
  return f.birthday_day && f.birthday_month ? daysUntilBirthday(f.birthday_day, f.birthday_month) : null;
}

function countdown(days: number): string {
  return days === 0 ? t('friends.today') : days === 1 ? t('friends.tomorrow') : t('friends.inDays', { count: days });
}

export default function Friends() {
  const friends = useFriends();
  const list = friends.data ?? [];
  const soon = list
    .filter((f) => (birthdayIn(f) ?? Infinity) <= SOON_DAYS)
    .sort((a, b) => birthdayIn(a)! - birthdayIn(b)!);

  return (
    <Screen scroll edges={['top']} refreshing={friends.isRefetching} onRefresh={friends.refetch}>
      <PageHeader eyebrow={list.length ? t('friends.count', { count: list.length }) : null} title={t('friends.title')} />
      <ErrorText error={friends.error} />

      {friends.isPending ? null : list.length === 0 ? (
        <EmptyState icon="users" color={pastels[7]} title={t('friends.empty.title')} body={t('friends.empty.body')} />
      ) : (
        <>
          {soon.length ? (
            <>
              <SectionTitle>{t('friends.soon')}</SectionTitle>
              <Grid>
                {soon.map((f) => (
                  <FriendTile key={f.id} friend={f} highlight />
                ))}
              </Grid>
            </>
          ) : null}

          <SectionTitle>{t('friends.everyone')}</SectionTitle>
          <Grid>
            {list.map((f) => (
              <FriendTile key={f.id} friend={f} />
            ))}
          </Grid>
        </>
      )}
    </Screen>
  );
}

function FriendTile({ friend, highlight = false }: { friend: Friend; highlight?: boolean }) {
  const days = birthdayIn(friend);
  const birthday = days !== null ? formatDayMonth(friend.birthday_day!, friend.birthday_month!) : null;
  const city = friend.city ? `${countryFlag(friend.country_code)} ${friend.city}` : null;
  return (
    <ColorCard
      href={{ pathname: '/friend/[id]', params: { id: friend.id } }}
      color={friend.pin_color}
      badge={<Avatar name={friend.display_name} url={friend.avatar_url} color={friend.pin_color} size={50} ring={0} />}
      title={friend.display_name}
      subtitle={[city, !highlight && birthday ? t('friends.birthdayOn', { date: birthday }) : null].filter(Boolean).join(' · ')}
      tag={highlight && days !== null ? <Chip icon="gift" label={`${countdown(days)} · ${birthday}`} tone="accent" /> : null}
    />
  );
}
