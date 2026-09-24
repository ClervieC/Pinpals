import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { ConfirmButton, GroupForm } from '@/components/GroupForm';
import { InviteButton } from '@/components/InviteButton';
import { Button, ErrorText, Loading, Screen, T } from '@/components/ui';
import { useUserId } from '@/lib/auth';
import { countryFlag } from '@/lib/geo';
import { inviteUrl } from '@/lib/invite';
import {
  useGroup,
  useGroupMembers,
  useLeaveGroup,
  useRegenerateInviteCode,
  useRemoveMember,
  useUpdateGroup,
} from '@/lib/queries';
import { colors, fonts, radius, shade, tint } from '@/lib/theme';

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
    <Screen scroll>
      <View style={[styles.invite, { backgroundColor: tint(g.color, 0.4) }]}>
        <T variant="label" style={{ color: shade(g.color, 0.55) }}>
          Code d&apos;invitation
        </T>
        <Pressable onPress={copy}>
          <T style={styles.code}>{g.invite_code}</T>
          <T variant="caption" style={{ textAlign: 'center' }}>
            {copied ? 'Lien copié ✅' : 'Touche pour copier le lien'}
          </T>
        </Pressable>
        <InviteButton group={g} />
        {isAdmin ? (
          <Button
            label="Générer un nouveau code"
            kind="ghost"
            loading={regenerate.isPending}
            onPress={() => regenerate.mutate()}
          />
        ) : null}
        <ErrorText error={regenerate.error} />
      </View>

      {isAdmin ? (
        <View style={{ gap: 12 }}>
          <T variant="heading">Le groupe</T>
          <GroupForm
            initial={{ name: g.name, emoji: g.emoji, color: g.color }}
            submitLabel="Enregistrer"
            loading={update.isPending}
            error={update.error}
            onSubmit={(values) => update.mutate(values)}
          />
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <T variant="heading">Membres ({members.data?.length ?? g.member_count})</T>
        <ErrorText error={members.error ?? remove.error} />
        {members.data?.map((m) => (
          <View key={m.profile.id} style={styles.member}>
            <Avatar name={m.profile.display_name} url={m.profile.avatar_url} color={m.profile.pin_color} size={44} />
            <View style={{ flex: 1 }}>
              <T style={{ fontFamily: fonts.bold }}>
                {m.profile.display_name}
                {m.profile.id === uid ? ' (toi)' : ''}
                {m.role === 'admin' ? ' 👑' : ''}
              </T>
              <T variant="caption">
                {m.profile.city ? `${countryFlag(m.profile.country_code)} ${m.profile.city}` : 'Pas encore de pin'}
              </T>
            </View>
            {isAdmin && m.profile.id !== uid ? (
              <Pressable onPress={() => remove.mutate(m.profile.id)} hitSlop={8} accessibilityLabel="Retirer du groupe">
                <T style={{ color: colors.danger, fontFamily: fonts.bold }}>Retirer</T>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      <ErrorText error={leave.error} />
      <ConfirmButton
        label="Quitter le groupe"
        confirmLabel="Sûr·e ? Touche encore pour quitter"
        loading={leave.isPending}
        onConfirm={() => leave.mutate(undefined, { onSuccess: () => router.dismissTo('/') })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  invite: { padding: 20, gap: 12, borderRadius: radius.lg },
  code: { fontFamily: fonts.black, fontSize: 36, letterSpacing: 6, textAlign: 'center', color: colors.ink },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: radius.md, backgroundColor: colors.paper },
});
