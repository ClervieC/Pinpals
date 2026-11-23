import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { countryFlag } from '@/lib/geo';
import { t, tn } from '@/lib/i18n';
import { useInvitableFriends, useMyInvitations, useRespondToInvitation, useToggleGroupInvitation } from '@/lib/queries';
import { colors, fonts, radius, shade, themed, tint } from '@/lib/theme';

import { Avatar } from './Avatar';
import { Button, ErrorText, Icon, SectionCard, T } from './ui';

/**
 * Inviter dans un groupe des ami·es existant·es (les gens avec qui on partage déjà un groupe).
 * Rien ne s'affiche si personne n'est à inviter : le lien reste alors le seul moyen.
 */
export function InviteFriends({ groupId }: { groupId: string }) {
  const friends = useInvitableFriends(groupId);
  const toggle = useToggleGroupInvitation(groupId);
  const list = friends.data ?? [];
  if (list.length === 0) return null;

  return (
    <SectionCard icon="user-plus" title={t('invite.friends.title')}>
      <T variant="caption">{t('invite.friends.body')}</T>
      <ErrorText error={friends.error ?? toggle.error} />
      {list.map((f, i) => (
        <View key={f.id} style={[styles.row, i > 0 && styles.divider]}>
          <Avatar name={f.display_name} url={f.avatar_url} color={f.pin_color} size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <T style={{ fontFamily: fonts.semibold }} numberOfLines={1}>
              {f.display_name}
            </T>
            {f.city ? (
              <T variant="caption" numberOfLines={1}>
                {`${countryFlag(f.country_code)} ${f.city}`}
              </T>
            ) : null}
          </View>
          <Pressable
            onPress={() => toggle.mutate({ uid: f.id, invite: !f.invited })}
            accessibilityRole="button"
            accessibilityState={{ selected: f.invited }}
            accessibilityLabel={t(f.invited ? 'invite.friends.cancelA11y' : 'invite.friends.inviteA11y', { name: f.display_name })}
            hitSlop={6}
            style={({ pressed }) => [styles.pill, f.invited ? styles.pillOn : styles.pillOff, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Icon name={f.invited ? 'check' : 'plus'} size={14} color={f.invited ? shade(colors.accent, 0.3) : colors.onAccent} />
            <T style={[styles.pillText, { color: f.invited ? shade(colors.accent, 0.3) : colors.onAccent }]}>
              {f.invited ? t('invite.friends.invited') : t('invite.friends.invite')}
            </T>
          </Pressable>
        </View>
      ))}
    </SectionCard>
  );
}

/** Invitations reçues, sur l'accueil : rejoindre ou refuser. */
export function InvitationsCard() {
  const invitations = useMyInvitations();
  const respond = useRespondToInvitation();
  const list = invitations.data ?? [];
  if (list.length === 0) return null;

  return (
    <SectionCard icon="mail" title={t('invitations.title')} style={{ alignSelf: 'stretch' }}>
      <ErrorText error={respond.error} />
      {list.map((inv, i) => {
        const busy = respond.isPending && respond.variables?.gid === inv.group_id;
        return (
          <View key={inv.group_id} style={[styles.invitation, i > 0 && styles.divider]}>
            <View style={styles.invitationHead}>
              <View style={[styles.badge, { backgroundColor: tint(inv.color, 0.65) }]}>
                <T style={{ fontSize: 26 }}>{inv.emoji}</T>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="caption">
                  {inv.inviter_name ? t('invitations.from', { name: inv.inviter_name }) : t('invitations.anonymous')}
                </T>
                <T style={{ fontFamily: fonts.semibold, fontSize: 16 }} numberOfLines={2}>
                  {inv.name}
                </T>
                <T variant="caption">{tn('common.members', inv.member_count)}</T>
              </View>
            </View>
            <View style={styles.actions}>
              <Button
                label={t('invitations.decline')}
                kind="ghost"
                disabled={busy}
                onPress={() => respond.mutate({ gid: inv.group_id, accept: false })}
                style={{ flex: 1 }}
              />
              <Button
                label={t('invitations.accept')}
                icon="check"
                loading={busy && respond.variables?.accept}
                disabled={busy}
                onPress={() =>
                  respond.mutate(
                    { gid: inv.group_id, accept: true },
                    { onSuccess: () => router.push({ pathname: '/group/[id]', params: { id: inv.group_id } }) },
                  )
                }
                style={{ flex: 1 }}
              />
            </View>
          </View>
        );
      })}
    </SectionCard>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    divider: { borderTopWidth: 1, borderTopColor: colors.line },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: radius.pill,
      borderWidth: 1.5,
    },
    pillOff: { backgroundColor: colors.accent, borderColor: colors.accent },
    pillOn: { backgroundColor: tint(colors.accent, 0.85), borderColor: tint(colors.accent, 0.5) },
    pillText: { fontFamily: fonts.semibold, fontSize: 13 },
    invitation: { gap: 12, paddingVertical: 12 },
    invitationHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    badge: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    actions: { flexDirection: 'row', gap: 8 },
  }),
);
