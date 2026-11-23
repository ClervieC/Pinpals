import { useEffect } from 'react';

import { InvitationsCard } from '@/components/GroupInvitations';
import { BirthdayRow, NotificationRow, REMINDER_DAYS } from '@/components/Notifications';
import { Button, Card, EmptyState, ErrorText, Screen, SectionCard, SectionTitle } from '@/components/ui';
import { upcomingBirthdays } from '@/lib/birthdays';
import { t } from '@/lib/i18n';
import { useFriends, useMarkNotificationsRead, useMyInvitations, useNotifications } from '@/lib/queries';
import { pastels } from '@/lib/theme';

export default function NotificationsScreen() {
  const notifications = useNotifications();
  const friends = useFriends();
  const invitations = useMyInvitations();
  const markRead = useMarkNotificationsRead();
  const birthdays = upcomingBirthdays(friends.data ?? [], REMINDER_DAYS);

  const items = notifications.items;
  // Ce qui était non lu à l'ouverture reste en avant pendant la visite : le marquage « lu » ne
  // recharge pas la liste, il remet seulement le compteur de la cloche à zéro.
  const newItems = items.filter((n) => !n.read_at);
  const olderItems = items.filter((n) => n.read_at);
  const hasUnread = newItems.length > 0;
  useEffect(() => {
    if (hasUnread) markRead.mutate();
  }, [hasUnread]); // eslint-disable-line react-hooks/exhaustive-deps

  const nothing = !notifications.isPending && !items.length && !birthdays.length && !invitations.data?.length;

  return (
    <Screen
      scroll
      edges={['bottom']}
      refreshing={notifications.isRefetching}
      onRefresh={() => {
        notifications.refetch();
        friends.refetch();
        invitations.refetch();
      }}
    >
      <ErrorText error={notifications.error} />
      <InvitationsCard />

      {birthdays.length ? (
        <SectionCard icon="gift" title={t('notifications.reminders')}>
          {birthdays.map((f, i) => (
            <BirthdayRow key={f.id} friend={f} divider={i > 0} />
          ))}
        </SectionCard>
      ) : null}

      {nothing ? (
        <EmptyState icon="bell" color={pastels[2]} title={t('notifications.empty.title')} body={t('notifications.empty.body')} />
      ) : null}

      {newItems.length ? (
        <>
          <SectionTitle>{t('notifications.new')}</SectionTitle>
          <Card style={{ gap: 0 }}>
            {newItems.map((n, i) => (
              <NotificationRow key={n.id} notification={n} fresh divider={i > 0} />
            ))}
          </Card>
        </>
      ) : null}

      {olderItems.length ? (
        <>
          <SectionTitle>{newItems.length ? t('notifications.earlier') : t('notifications.title')}</SectionTitle>
          <Card style={{ gap: 0 }}>
            {olderItems.map((n, i) => (
              <NotificationRow key={n.id} notification={n} fresh={false} divider={i > 0} />
            ))}
          </Card>
        </>
      ) : null}

      {notifications.hasNextPage ? (
        <Button
          label={t('notifications.more')}
          kind="secondary"
          icon="chevron-down"
          loading={notifications.isFetchingNextPage}
          onPress={() => notifications.fetchNextPage()}
        />
      ) : null}
    </Screen>
  );
}
