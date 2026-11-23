import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { FriendCard } from '@/components/FriendCard';
import { MemoryGrid } from '@/components/Memories';
import { PrivateNotes } from '@/components/PrivateNotes';
import { Chip, Hero } from '@/components/Tiles';
import { Button, ErrorText, Loading, Screen, SectionCard, SectionTitle, T } from '@/components/ui';
import { countryFlag } from '@/lib/geo';
import { t } from '@/lib/i18n';
import { useFriendAddress, useMemoriesPaged, useProfile } from '@/lib/queries';
import { colors, themed } from '@/lib/theme';

export default function FriendScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useProfile(id);
  const address = useFriendAddress(id);
  const memories = useMemoriesPaged({ friendId: id });

  if (profile.isPending) return <Loading />;
  const friend = profile.data;
  if (!friend) {
    return (
      <Screen>
        <T variant="heading">{t('friend.notFound')}</T>
        <ErrorText error={profile.error} />
      </Screen>
    );
  }

  const city = friend.city ? `${countryFlag(friend.country_code)} ${friend.city}${friend.country ? `, ${friend.country}` : ''}` : null;
  const job = [friend.job_title, friend.company].filter(Boolean).join(' · ');

  return (
    <Screen scroll edges={['bottom']}>
      <Stack.Screen options={{ title: '' }} />

      <Hero
        color={friend.pin_color}
        badge={<Avatar name={friend.display_name} url={friend.avatar_url} color={friend.pin_color} size={72} ring={0} />}
        title={friend.display_name}
      >
        <View style={styles.chips}>
          {city ? <Chip label={city} /> : null}
          {job ? <Chip icon="briefcase" label={job} /> : null}
        </View>
        {friend.bio ? <T style={{ color: colors.inkSoft }}>{friend.bio}</T> : null}
      </Hero>

      <SectionCard icon="heart" title={t('friend.card')}>
        <FriendCard profile={friend} />
      </SectionCard>

      {address.data ? (
        <SectionCard icon="mail" title={t('friend.address')}>
          <T selectable>
            {[
              address.data.line1,
              address.data.line2,
              [address.data.postal_code, address.data.city].filter(Boolean).join(' '),
              address.data.country,
            ]
              .filter(Boolean)
              .join('\n')}
          </T>
        </SectionCard>
      ) : null}

      <SectionCard icon="lock" title={t('friend.private.title')} right={<Chip label={t('friend.private.hint')} />}>
        <PrivateNotes friendId={id} />
      </SectionCard>

      <SectionTitle>{t('friend.memories')}</SectionTitle>
      {memories.isPending ? null : (
        <MemoryGrid
          memories={memories.items}
          error={memories.error}
          onAdd={() => router.push({ pathname: '/memory/new', params: { friendId: id } })}
        />
      )}
      {memories.hasNextPage ? (
        <Button
          label={t('memories.more')}
          kind="secondary"
          icon="chevron-down"
          loading={memories.isFetchingNextPage}
          onPress={() => memories.fetchNextPage()}
        />
      ) : null}
    </Screen>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  }),
);
