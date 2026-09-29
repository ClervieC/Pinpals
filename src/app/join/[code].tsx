import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Button, ErrorText, Loading, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { t, tn } from '@/lib/i18n';
import { pendingInvite } from '@/lib/invite';
import { useGroupPreview, useJoinGroup, useMyGroups, useProfile } from '@/lib/queries';
import { colors, shade, tint } from '@/lib/theme';

/** Ouvert par pinpals://join/CODE ou https://pinpals.app/join/CODE. */
export default function Join() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const code = (raw ?? '').trim().toUpperCase();
  const { session } = useAuth();
  const profile = useProfile(session?.user.id);
  const preview = useGroupPreview(code);
  const myGroups = useMyGroups(!!session);
  const join = useJoinGroup();

  if (preview.isPending) return <Loading />;

  const group = preview.data;
  if (!group) {
    return (
      <Screen>
        <View style={styles.center}>
          <T style={{ fontSize: 56 }}>🧐</T>
          <T variant="heading">{t('join.notFound')}</T>
          <ErrorText error={preview.error} />
          <Button label={t('common.back')} kind="ghost" onPress={() => router.replace('/')} />
        </View>
      </Screen>
    );
  }

  const onboarded = !!profile.data && profile.data.lat != null;
  const alreadyIn = !!session && myGroups.data?.some((g) => g.id === group.id);

  async function onPress() {
    if (alreadyIn) {
      router.replace({ pathname: '/group/[id]', params: { id: group!.id } });
      return;
    }
    // Pas encore de compte (ou onboarding pas fini) : on garde le code et on revient après.
    if (!session || !onboarded) {
      await pendingInvite.set(code);
      router.replace(session ? '/profile' : '/sign-in');
      return;
    }
    join.mutate(code, {
      onSuccess: (id) => router.replace({ pathname: '/group/[id]', params: { id } }),
    });
  }

  const label = alreadyIn
    ? t('join.open')
    : !session
      ? t('join.signUp')
      : !onboarded
        ? t('join.finishProfile')
        : t('join.join');

  return (
    <Screen background={tint(group.color, 0.55)}>
      <View style={styles.center}>
        <Animated.View entering={ZoomIn.springify().damping(10)} style={[styles.badge, { backgroundColor: group.color }]}>
          <T style={{ fontSize: 64 }}>{group.emoji}</T>
        </Animated.View>
        <T variant="caption" style={{ color: shade(group.color, 0.55) }}>
          {t('join.invited')}
        </T>
        <T variant="title" style={{ textAlign: 'center' }}>
          {group.name}
        </T>
        <T style={{ color: colors.inkSoft }}>{tn('join.count', group.member_count)}</T>
      </View>
      <ErrorText error={join.error} />
      <Button label={label} color={group.color} loading={join.isPending} onPress={onPress} />
      {session ? <Button label={t('common.later')} kind="ghost" onPress={() => router.replace('/')} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  badge: { width: 120, height: 120, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
});
