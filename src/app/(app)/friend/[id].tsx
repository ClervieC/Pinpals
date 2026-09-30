import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { FriendCard } from '@/components/FriendCard';
import { MemoryGrid } from '@/components/Memories';
import { Chip, Hero } from '@/components/Tiles';
import { Button, ErrorText, Field, Loading, Screen, SectionCard, SectionTitle, T } from '@/components/ui';
import { countryFlag } from '@/lib/geo';
import { t } from '@/lib/i18n';
import { useFriendAddress, useFriendNote, useMemories, useProfile, useSaveFriendNote } from '@/lib/queries';
import { colors } from '@/lib/theme';
import type { FriendNote } from '@/lib/types';

export default function FriendScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useProfile(id);
  const address = useFriendAddress(id);
  const memories = useMemories({ friendId: id });
  const note = useFriendNote(id);
  const saveNote = useSaveFriendNote(id);

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
        {note.isPending ? null : (
          // Remonté à chaque enregistrement : les champs repartent de la version sauvegardée.
          <PrivateNotes
            key={JSON.stringify(note.data)}
            note={note.data ?? null}
            saving={saveNote.isPending}
            saved={saveNote.isSuccess}
            error={note.error ?? saveNote.error}
            onSave={(input) => saveNote.mutate(input)}
          />
        )}
      </SectionCard>

      <SectionTitle>{t('friend.memories')}</SectionTitle>
      {memories.isPending ? null : (
        <MemoryGrid
          memories={memories.data ?? []}
          error={memories.error}
          onAdd={() => router.push({ pathname: '/memory/new', params: { friendId: id } })}
        />
      )}
    </Screen>
  );
}

type NotesProps = {
  note: FriendNote | null;
  saving: boolean;
  saved: boolean;
  error: unknown;
  onSave: (input: Pick<FriendNote, 'gift_ideas' | 'notes'>) => void;
};

/** Idées cadeaux et notes : visibles uniquement par moi. */
function PrivateNotes({ note, saving, saved, error, onSave }: NotesProps) {
  const [gifts, setGifts] = useState(note?.gift_ideas ?? '');
  const [notes, setNotes] = useState(note?.notes ?? '');
  const dirty = gifts !== (note?.gift_ideas ?? '') || notes !== (note?.notes ?? '');

  return (
    <View style={{ gap: 12 }}>
      <Field
        label={t('friend.private.gifts')}
        value={gifts}
        onChangeText={setGifts}
        placeholder={t('friend.private.giftsPlaceholder')}
        multiline
        maxLength={2000}
        style={styles.multiline}
      />
      <Field
        label={t('friend.private.notes')}
        value={notes}
        onChangeText={setNotes}
        placeholder={t('friend.private.notesPlaceholder')}
        multiline
        maxLength={2000}
        style={styles.multiline}
      />
      <ErrorText error={error} />
      <Button
        label={saved && !dirty ? t('common.saved') : t('common.save')}
        kind="secondary"
        icon={saved && !dirty ? 'check' : undefined}
        loading={saving}
        disabled={!dirty}
        onPress={() => onSave({ gift_ideas: gifts.trim() || null, notes: notes.trim() || null })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  multiline: { minHeight: 80, paddingTop: 12, textAlignVertical: 'top' },
});
