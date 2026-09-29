import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { ConfirmButton } from '@/components/GroupForm';
import { pickPhotos } from '@/components/Memories';
import { Button, ErrorText, Loading, Screen, T } from '@/components/ui';
import { useUserId } from '@/lib/auth';
import { formatDateRange, t } from '@/lib/i18n';
import {
  useAddMemoryPhotos,
  useDeleteMemory,
  useDeleteMemoryPhoto,
  useFriends,
  useMemory,
  useMyGroups,
  useMyProfile,
  useSignedUrls,
} from '@/lib/queries';
import { colors, fonts, radius, tint } from '@/lib/theme';
import type { MemoryPhoto } from '@/lib/types';

/** Une page du scrapbook : récit, personnes, photos. Toute l'audience peut ajouter des photos. */
export default function MemoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const uid = useUserId();
  const memory = useMemory(id);
  const groups = useMyGroups();
  const friends = useFriends();
  const me = useMyProfile();
  const addPhotos = useAddMemoryPhotos(id);
  const deletePhoto = useDeleteMemoryPhoto(id);
  const deleteMemory = useDeleteMemory(id);
  const urls = useSignedUrls(memory.data?.photos.map((p) => p.path) ?? []);
  const [selected, setSelected] = useState<MemoryPhoto | null>(null);

  if (memory.isPending) return <Loading />;
  const m = memory.data;
  if (!m) {
    return (
      <Screen>
        <T variant="heading">{t('memory.notFound')}</T>
        <ErrorText error={memory.error} />
      </Screen>
    );
  }

  const isAuthor = m.author_id === uid;
  const group = groups.data?.find((g) => g.id === m.group_id);
  const everyone = [...(friends.data ?? []), ...(me.data ? [me.data] : [])];
  const people = [m.author_id, ...m.people.filter((p) => p !== m.author_id)].flatMap((pid) => {
    const p = everyone.find((f) => f.id === pid);
    return p ? [p] : [];
  });
  const when = formatDateRange(m.happened_on, m.ends_on);

  async function add() {
    const images = await pickPhotos();
    if (images.length) addPhotos.mutate(images);
  }

  return (
    <Screen scroll>
      <Stack.Screen
        options={{
          title: m.kind === 'trip' ? t('memory.kind.trip') : t('memory.kind.memory'),
          headerRight: isAuthor
            ? () => (
                <Pressable onPress={() => router.push({ pathname: '/memory/edit/[id]', params: { id } })} hitSlop={8}>
                  <T style={{ fontFamily: fonts.bold }}>{t('memory.edit.button')}</T>
                </Pressable>
              )
            : undefined,
        }}
      />

      <View style={styles.page}>
        <T variant="title">{m.title}</T>
        {when || m.place ? (
          <T style={{ fontFamily: fonts.bold, color: colors.inkSoft }}>
            {[m.place ? `📍 ${m.place}` : null, when ? `🗓️ ${when}` : null].filter(Boolean).join('   ')}
          </T>
        ) : null}
        {group ? (
          <T variant="caption">
            {group.emoji} {group.name}
          </T>
        ) : null}
        {m.body ? <T style={{ marginTop: 6 }}>{m.body}</T> : null}

        {people.length ? (
          <View style={styles.people}>
            {people.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => p.id !== uid && router.push({ pathname: '/friend/[id]', params: { id: p.id } })}
                style={styles.person}
              >
                <Avatar name={p.display_name} url={p.avatar_url} color={p.pin_color} size={30} ring={2} />
                <T style={{ fontFamily: fonts.semibold, fontSize: 14 }}>{p.display_name}</T>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <Button label={t('memory.addPhotos')} onPress={add} loading={addPhotos.isPending} />
      <ErrorText error={addPhotos.error ?? deletePhoto.error ?? urls.error} />

      <View style={styles.grid}>
        {m.photos.map((photo, i) => (
          <Pressable
            key={photo.id}
            onPress={() => setSelected(selected?.id === photo.id ? null : photo)}
            style={[styles.cell, { transform: [{ rotate: `${((i % 3) - 1) * 1.5}deg` }] }]}
          >
            <View style={styles.polaroid}>
              {urls.data?.[photo.path] ? (
                <Image source={{ uri: urls.data[photo.path] }} style={styles.photo} contentFit="cover" transition={150} />
              ) : (
                <View style={[styles.photo, { backgroundColor: tint(colors.pink, 0.7) }]} />
              )}
            </View>
          </Pressable>
        ))}
      </View>

      {selected && (selected.uploaded_by === uid || isAuthor) ? (
        <Button
          label={t('memory.deletePhoto')}
          kind="danger"
          loading={deletePhoto.isPending}
          onPress={() => deletePhoto.mutate(selected, { onSuccess: () => setSelected(null) })}
        />
      ) : null}

      {isAuthor ? (
        <>
          <ErrorText error={deleteMemory.error} />
          <ConfirmButton
            label={t('memory.delete')}
            confirmLabel={t('memory.deleteConfirm')}
            loading={deleteMemory.isPending}
            onConfirm={() =>
              deleteMemory.mutate(
                m.photos.map((p) => p.path),
                { onSuccess: () => (router.canGoBack() ? router.back() : router.replace('/memories')) },
              )
            }
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 18, gap: 8, borderRadius: radius.lg, backgroundColor: colors.paper },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 10, borderRadius: radius.pill, backgroundColor: colors.cream },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  cell: { width: '50%', padding: 8 },
  polaroid: {
    backgroundColor: colors.paper,
    padding: 6,
    paddingBottom: 18,
    borderRadius: 4,
    shadowColor: '#5E5169',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 2 },
});
