import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Button, ErrorText, Icon, Loading, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { t, tn } from '@/lib/i18n';
import { pendingInvite } from '@/lib/invite';
import { useGroupPreview, useJoinGroup, useMyGroups, useProfile } from '@/lib/queries';
import { colors, tint } from '@/lib/theme';

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
          <Icon name="help-circle" size={36} color={colors.inkSoft} />
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
    <Screen>
      <View style={styles.center}>
        <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.badge, { backgroundColor: tint(group.color, 0.65) }]}>
          <T style={{ fontSize: 52 }}>{group.emoji}</T>
        </Animated.View>
        <T variant="label">{t('join.invited')}</T>
        <T variant="title" style={{ textAlign: 'center' }}>
          {group.name}
        </T>
        <T variant="caption">{tn('join.count', group.member_count)}</T>
      </View>
      <ErrorText error={join.error} />
      <Button label={label} loading={join.isPending} onPress={onPress} />
      {session ? <Button label={t('common.later')} kind="ghost" onPress={() => router.replace('/')} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  badge: { width: 112, height: 112, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
});
