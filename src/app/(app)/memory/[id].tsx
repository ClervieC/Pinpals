import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { ConfirmButton } from '@/components/GroupForm';
import { colorFor, pickPhotos } from '@/components/Memories';
import { MemoryComments } from '@/components/MemoryComments';
import { PhotoViewer } from '@/components/PhotoViewer';
import { Polaroid } from '@/components/Polaroid';
import { Chip, Hero } from '@/components/Tiles';
import { ErrorText, Icon, Loading, Screen, SectionCard, T } from '@/components/ui';
import { useUserId } from '@/lib/auth';
import { formatDate, formatDateRange, t } from '@/lib/i18n';
import {
  useAddMemoryPhotos,
  useDeleteMemory,
  useDeleteMemoryPhoto,
  useFriends,
  useMemory,
  useMyGroups,
  useMyProfile,
  usePhotoSocial,
  useSignedUrls,
} from '@/lib/queries';
import { colors, fonts, radius, shade, themed, tint } from '@/lib/theme';

/** Une page du scrapbook : récit, personnes, photos. Toute l'audience peut ajouter des photos. */
export default function MemoryScreen() {
  const { id, photoError } = useLocalSearchParams<{ id: string; photoError?: string }>();
  const uid = useUserId();
  const memory = useMemory(id);
  const groups = useMyGroups();
  const friends = useFriends();
  const me = useMyProfile();
  const addPhotos = useAddMemoryPhotos(id);
  const deletePhoto = useDeleteMemoryPhoto(id);
  const deleteMemory = useDeleteMemory(id);
  const urls = useSignedUrls(memory.data?.photos.map((p) => p.path) ?? []);
  // Photo ouverte en grand (index dans m.photos) ; null = visionneuse fermée.
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const social = usePhotoSocial(id, memory.data?.photos.map((p) => p.id) ?? []);
  // Mur de polaroïds sur 3 colonnes : largeur de l'écran (max 760) moins les marges de l'écran et de la carte.
  const { width: screenWidth } = useWindowDimensions();
  const polaroidWidth = Math.floor((Math.min(screenWidth, 760) - 40 - 36) / 3) - 16;

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
  const color = colorFor(m.id);
  const coverUrl = m.photos[0] ? urls.data?.[m.photos[0].path] : undefined;

  async function add() {
    const images = await pickPhotos();
    if (images.length) addPhotos.mutate(images);
  }

  return (
    <Screen scroll edges={['bottom']}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: isAuthor
            ? () => (
                <Pressable
                  onPress={() => router.push({ pathname: '/memory/edit/[id]', params: { id } })}
                  hitSlop={8}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  <Icon name="edit-2" size={15} />
                  <T style={{ fontFamily: fonts.medium }}>{t('memory.edit.button')}</T>
                </Pressable>
              )
            : undefined,
        }}
      />

      <Hero
        color={color}
        eyebrow={m.kind === 'trip' ? t('memory.kind.trip') : t('memory.kind.memory')}
        title={m.title}
        badge={<Icon name={m.kind === 'trip' ? 'navigation' : 'camera'} size={30} color={shade(color, 0.2)} />}
        cover={
          coverUrl ? <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : undefined
        }
      >
        <View style={styles.chips}>
          {m.place ? <Chip icon="map-pin" label={m.place} /> : null}
          {when ? <Chip icon="calendar" label={when} /> : null}
          {group ? <Chip icon="users" label={`${group.emoji} ${group.name}`} /> : null}
        </View>
        {m.body ? <T style={{ lineHeight: 24, marginTop: 4 }}>{m.body}</T> : null}
        {people.length ? (
          <View style={styles.people}>
            {people.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => p.id !== uid && router.push({ pathname: '/friend/[id]', params: { id: p.id } })}
                style={styles.person}
              >
                <Avatar name={p.display_name} url={p.avatar_url} color={p.pin_color} size={26} ring={2} />
                <T style={{ fontFamily: fonts.medium, fontSize: 14 }}>{p.display_name}</T>
              </Pressable>
            ))}
          </View>
        ) : null}
      </Hero>

      <SectionCard icon="image" title={t('memory.photos', { count: m.photos.length })}>
        <View style={styles.grid}>
          {m.photos.map((photo, i) => (
            <Pressable
              key={photo.id}
              onPress={() => setViewerIndex(i)}
              accessibilityRole="imagebutton"
              accessibilityLabel={photo.caption ?? t('photo.open')}
              style={styles.cell}
            >
              <Polaroid
                uri={urls.data?.[photo.path]}
                color={color}
                width={polaroidWidth}
                rotate={TILTS[i % TILTS.length]}
                tape={i % 3 === 0}
                caption={photo.caption ?? (photo.taken_on ? formatDate(photo.taken_on) : null)}
              />
              <PhotoCounts
                likes={social.data?.likes.filter((l) => l.photo_id === photo.id).length ?? 0}
                comments={social.data?.comments.filter((c) => c.photo_id === photo.id).length ?? 0}
              />
            </Pressable>
          ))}
          <Pressable onPress={add} disabled={addPhotos.isPending} style={styles.cell}>
            <View style={[styles.addTile, { width: polaroidWidth }]}>
              <Icon name={addPhotos.isPending ? 'loader' : 'camera'} size={22} color={colors.accent} />
              <T variant="caption" style={{ color: colors.accent, fontFamily: fonts.medium }}>
                {t('memory.addPhotos')}
              </T>
            </View>
          </Pressable>
        </View>
        <T variant="caption">{t('memory.photosHint')}</T>
        <ErrorText
          error={addPhotos.error ?? urls.error ?? social.error ?? (photoError && !addPhotos.isSuccess ? t('memory.photoUploadFailed') : null)}
        />
      </SectionCard>

      <PhotoViewer
        memoryId={m.id}
        memoryAuthorId={m.author_id}
        photos={m.photos}
        urls={urls.data}
        likes={social.data?.likes ?? []}
        comments={social.data?.comments ?? []}
        people={everyone}
        index={viewerIndex}
        onIndexChange={setViewerIndex}
        onClose={() => setViewerIndex(null)}
        deleting={deletePhoto.isPending}
        onDelete={(photo) =>
          deletePhoto.mutate(photo, {
            // Dernière photo supprimée : on ferme ; sinon on reste sur une photo voisine.
            onSuccess: () => setViewerIndex((i) => (m.photos.length <= 1 || i === null ? null : Math.min(i, m.photos.length - 2))),
          })
        }
      />

      <MemoryComments memoryId={m.id} memoryAuthorId={m.author_id} />

      {isAuthor ? (
        <View style={{ marginTop: 16 }}>
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
        </View>
      ) : null}
    </Screen>
  );
}

// Inclinaisons du mur de photos : variées mais discrètes.
const TILTS = [-3, 2, -1.5, 3, -2, 1];

/** Petits compteurs sous un polaroïd : n'apparaissent que s'il y a des likes ou des commentaires. */
function PhotoCounts({ likes, comments }: { likes: number; comments: number }) {
  if (!likes && !comments) return null;
  return (
    <View style={styles.counts}>
      {likes ? (
        <View style={styles.count}>
          <Icon name="heart" size={11} color={colors.accent} />
          <T variant="caption" style={{ fontSize: 11 }}>
            {likes}
          </T>
        </View>
      ) : null}
      {comments ? (
        <View style={styles.count}>
          <Icon name="message-circle" size={11} color={colors.inkSoft} />
          <T variant="caption" style={{ fontSize: 11 }}>
            {comments}
          </T>
        </View>
      ) : null}
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    people: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    person: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingLeft: 3,
      paddingRight: 10,
      paddingVertical: 3,
      borderRadius: radius.pill,
      backgroundColor: colors.paper,
      borderWidth: 1,
      borderColor: colors.line,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, paddingTop: 6 },
    cell: { width: '33.33%', alignItems: 'center', paddingVertical: 10 },
    counts: { flexDirection: 'row', gap: 8, marginTop: 8 },
    count: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    addTile: {
      aspectRatio: 0.84,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      padding: 6,
      borderRadius: radius.sm,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: tint(colors.accent, 0.4),
      backgroundColor: tint(colors.accent, 0.92),
    },
  }),
);
