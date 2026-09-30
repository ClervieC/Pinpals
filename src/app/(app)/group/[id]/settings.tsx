import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { ConfirmButton, GroupForm } from '@/components/GroupForm';
import { InviteButton } from '@/components/InviteButton';
import { Chip, Hero } from '@/components/Tiles';
import { Button, ErrorText, Icon, Loading, Screen, SectionCard, T } from '@/components/ui';
import { useUserId } from '@/lib/auth';
import { countryFlag } from '@/lib/geo';
import { t, tn } from '@/lib/i18n';
import { inviteUrl } from '@/lib/invite';
import {
  useGroup,
  useGroupMembers,
  useLeaveGroup,
  useRegenerateInviteCode,
  useRemoveMember,
  useUpdateGroup,
} from '@/lib/queries';
import { colors, fonts, radius, tint } from '@/lib/theme';

export default function GroupSettings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const uid = useUserId();
  const group = useGroup(id);
  const members = useGroupMembers(id);
  const update = useUpdateGroup(id);
  const regenerate = useRegenerateInviteCode(id);
  const leave = useLeaveGroup(id);
  const remove = useRemoveMember(id);
  const [copied, setCopied] = useState(false);

  if (group.isPending) return <Loading />;
  if (!group.data) return null;

  const g = group.data;
  const isAdmin = g.role === 'admin';

  async function copy() {
    await Clipboard.setStringAsync(inviteUrl(g.invite_code));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Screen scroll edges={['bottom']}>
      <Hero
        color={g.color}
        eyebrow={t('settings.title')}
        title={g.name}
        badge={<T style={{ fontSize: 40 }}>{g.emoji}</T>}
      >
        <Chip icon="users" label={tn('common.members', members.data?.length ?? g.member_count)} />
      </Hero>

      <SectionCard icon="send" title={t('settings.inviteCode')}>
        <Pressable onPress={copy} style={[styles.codeBox, { backgroundColor: tint(g.color, 0.8), borderColor: tint(g.color, 0.35) }]}>
          <T style={styles.code}>{g.invite_code}</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name={copied ? 'check' : 'copy'} size={13} color={colors.inkSoft} />
            <T variant="caption">{copied ? t('common.linkCopied') : t('settings.tapToCopy')}</T>
          </View>
        </Pressable>
        <InviteButton group={g} />
        {isAdmin ? (
          <Button
            label={t('settings.regenerate')}
            kind="ghost"
            icon="refresh-cw"
            loading={regenerate.isPending}
            onPress={() => regenerate.mutate()}
          />
        ) : null}
        <ErrorText error={regenerate.error} />
      </SectionCard>

      {isAdmin ? (
        <SectionCard icon="edit-3" title={t('settings.group')}>
          <GroupForm
            initial={{ name: g.name, emoji: g.emoji, color: g.color }}
            submitLabel={t('common.save')}
            loading={update.isPending}
            error={update.error}
            onSubmit={(values) => update.mutate(values)}
          />
        </SectionCard>
      ) : null}

      <SectionCard icon="users" title={t('settings.members', { count: members.data?.length ?? g.member_count })}>
        <ErrorText error={members.error ?? remove.error} />
        {members.data?.map((m, i) => (
          <View key={m.profile.id} style={[styles.member, i > 0 && styles.divider]}>
            <Avatar name={m.profile.display_name} url={m.profile.avatar_url} color={m.profile.pin_color} size={44} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <T style={{ fontFamily: fonts.semibold }}>
                  {m.profile.display_name}
                  {m.profile.id === uid ? t('settings.you') : ''}
                </T>
                {m.role === 'admin' ? <Chip label={t('settings.admin')} /> : null}
              </View>
              <T variant="caption">
                {m.profile.city ? `${countryFlag(m.profile.country_code)} ${m.profile.city}` : t('settings.noPin')}
              </T>
            </View>
            {isAdmin && m.profile.id !== uid ? (
              <Pressable onPress={() => remove.mutate(m.profile.id)} hitSlop={8} accessibilityLabel={t('settings.removeA11y')}>
                <T style={{ color: colors.danger, fontFamily: fonts.medium }}>{t('settings.remove')}</T>
              </Pressable>
            ) : null}
          </View>
        ))}
      </SectionCard>

      <ErrorText error={leave.error} />
      <ConfirmButton
        label={t('settings.leave')}
        confirmLabel={t('settings.leaveConfirm')}
        loading={leave.isPending}
        onConfirm={() => leave.mutate(undefined, { onSuccess: () => router.dismissTo('/') })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  codeBox: { alignItems: 'center', gap: 6, paddingVertical: 18, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed' },
  code: { fontFamily: fonts.displayHeavy, fontSize: 38, letterSpacing: 4, color: colors.ink },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
});
