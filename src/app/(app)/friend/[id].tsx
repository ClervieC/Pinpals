import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { FriendCard } from '@/components/FriendCard';
import { MemoryGrid } from '@/components/Memories';
import { Button, ErrorText, Field, Loading, Screen, T } from '@/components/ui';
import { countryFlag } from '@/lib/geo';
import { t } from '@/lib/i18n';
import { useFriendAddress, useFriendNote, useMemories, useProfile, useSaveFriendNote } from '@/lib/queries';
import { colors, fonts, radius, tint } from '@/lib/theme';

export default function FriendScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useProfile(id);
  const address = useFriendAddress(id);
  const memories = useMemories({ friendId: id });

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

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: friend.display_name }} />

      <View style={styles.hero}>
        <Avatar name={friend.display_name} url={friend.avatar_url} color={friend.pin_color} size={96} ring={5} />
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="title" numberOfLines={1}>
            {friend.display_name} {friend.pin_emoji ?? ''}
          </T>
          {friend.city ? (
            <T style={{ fontFamily: fonts.bold, color: colors.inkSoft }}>
              {countryFlag(friend.country_code)} {friend.city}
              {friend.country ? `, ${friend.country}` : ''}
            </T>
          ) : null}
          {friend.bio ? <T style={{ color: colors.inkSoft }}>{friend.bio}</T> : null}
        </View>
      </View>

      <Section title={t('friend.card')}>
        <FriendCard profile={friend} />
      </Section>

      {address.data ? (
        <Section title={t('friend.address')}>
          <View style={[styles.box, { backgroundColor: tint(friend.pin_color, 0.8) }]}>
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
          </View>
        </Section>
      ) : null}

      <PrivateNotes friendId={id} />

      <Section title={t('friend.memories')}>
        <Button
          label={t('friend.addMemory', { name: friend.display_name })}
          kind="ghost"
          onPress={() => router.push({ pathname: '/memory/new', params: { friendId: id } })}
        />
        {memories.data?.length ? (
          <MemoryGrid memories={memories.data} error={memories.error} />
        ) : memories.isPending ? null : (
          <T variant="caption">{t('friend.noMemories')}</T>
        )}
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <T variant="heading">{title}</T>
      {children}
    </View>
  );
}

/** Idées cadeaux et notes : visibles uniquement par moi. */
function PrivateNotes({ friendId }: { friendId: string }) {
  const note = useFriendNote(friendId);
  const save = useSaveFriendNote(friendId);
  const [gifts, setGifts] = useState('');
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setGifts(note.data?.gift_ideas ?? '');
    setNotes(note.data?.notes ?? '');
  }, [note.data]);

  const dirty = gifts !== (note.data?.gift_ideas ?? '') || notes !== (note.data?.notes ?? '');

  return (
    <View style={[styles.box, styles.private]}>
      <T variant="heading">{t('friend.private.title')}</T>
      <T variant="caption">{t('friend.private.hint')}</T>
      <Field
        label={t('friend.private.gifts')}
        value={gifts}
        onChangeText={(v) => {
          setGifts(v);
          setSaved(false);
        }}
        placeholder={t('friend.private.giftsPlaceholder')}
        multiline
        maxLength={2000}
        style={styles.multiline}
      />
      <Field
        label={t('friend.private.notes')}
        value={notes}
        onChangeText={(v) => {
          setNotes(v);
          setSaved(false);
        }}
        placeholder={t('friend.private.notesPlaceholder')}
        multiline
        maxLength={2000}
        style={styles.multiline}
      />
      <ErrorText error={note.error ?? save.error} />
      <Button
        label={saved && !dirty ? t('common.saved') : t('common.save')}
        kind="ghost"
        loading={save.isPending}
        disabled={!dirty}
        onPress={() =>
          save.mutate(
            { gift_ideas: gifts.trim() || null, notes: notes.trim() || null },
            { onSuccess: () => setSaved(true) },
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  box: { padding: 16, gap: 10, borderRadius: radius.lg },
  private: { backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.line, borderStyle: 'dashed' },
  multiline: { minHeight: 80, paddingTop: 12, textAlignVertical: 'top' },
});
