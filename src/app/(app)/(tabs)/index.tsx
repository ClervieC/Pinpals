import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { AddTile, Chip, ColorCard, Grid } from '@/components/Tiles';
import { Button, EmptyState, ErrorText, Field, PageHeader, Screen, SectionCard, T } from '@/components/ui';
import { countryFlag } from '@/lib/geo';
import { t, tn } from '@/lib/i18n';
import { pendingInvite } from '@/lib/invite';
import { useMyGroups, useMyProfile } from '@/lib/queries';
import { fonts, pastels } from '@/lib/theme';

export default function Home() {
  const { data: profile } = useMyProfile();
  const groups = useMyGroups();

  // Invitation ouverte avant d'avoir un compte : on y retourne une fois l'onboarding terminé.
  useEffect(() => {
    pendingInvite.get().then((code) => {
      if (!code) return;
      pendingInvite.clear();
      router.push({ pathname: '/join/[code]', params: { code } });
    });
  }, []);

  const list = groups.data ?? [];

  return (
    <Screen scroll edges={['top']} refreshing={groups.isRefetching} onRefresh={groups.refetch}>
      <PageHeader
        eyebrow={profile ? t('home.greeting', { name: profile.display_name }) : null}
        title={t('home.title')}
        right={
          <Link href="/me" asChild>
            <Pressable accessibilityLabel={t('me.title')}>
              {profile ? (
                <Avatar name={profile.display_name} url={profile.avatar_url} color={profile.pin_color} size={48} ring={3} />
              ) : null}
            </Pressable>
          </Link>
        }
      />
      {profile?.city ? (
        <Chip label={`${countryFlag(profile.country_code)} ${t('home.youAreIn', { city: profile.city })}`} />
      ) : null}

      <ErrorText error={groups.error} />

      {groups.isPending ? null : list.length === 0 ? (
        <EmptyState icon="map" color={pastels[4]} title={t('home.empty.title')} body={t('home.empty.body')}>
          <Button label={t('home.empty.cta')} icon="plus" onPress={() => router.push('/group/new')} style={{ alignSelf: 'stretch' }} />
          <JoinCard />
        </EmptyState>
      ) : (
        <>
          <Grid>
            {list.map((g) => (
              <ColorCard
                key={g.id}
                href={{ pathname: '/group/[id]', params: { id: g.id } }}
                color={g.color}
                badge={<T style={{ fontSize: 30 }}>{g.emoji}</T>}
                title={g.name}
                subtitle={tn('common.members', g.member_count)}
              />
            ))}
            <AddTile label={t('home.createGroup')} body={t('group.new.body')} onPress={() => router.push('/group/new')} />
          </Grid>
          <JoinCard />
        </>
      )}
    </Screen>
  );
}

function JoinCard() {
  const [code, setCode] = useState('');
  const clean = code.trim().toUpperCase();
  return (
    <SectionCard icon="key" title={t('home.joinTitle')} style={{ alignSelf: 'stretch' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Field
            value={code}
            onChangeText={setCode}
            placeholder={t('home.codePlaceholder')}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            style={{ letterSpacing: 2, fontFamily: fonts.semibold }}
          />
        </View>
        <Button
          label={t('home.join')}
          disabled={clean.length < 8}
          onPress={() => router.push({ pathname: '/join/[code]', params: { code: clean } })}
        />
      </View>
    </SectionCard>
  );
}
