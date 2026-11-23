import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUserId } from '@/lib/auth';
import { formatDate, t } from '@/lib/i18n';
import { useAddPhotoComment, useDeletePhotoComment, useTogglePhotoLike, useUpdateMemoryPhoto } from '@/lib/queries';
import { colors, fonts, pastels, radius, themed, tint } from '@/lib/theme';
import type { MemoryPhoto, PhotoComment, PhotoLike, Profile } from '@/lib/types';

import { Avatar } from './Avatar';
import { CommentComposer, CommentList } from './CommentThread';
import { DateField, type DateParts, datePartsFromISO, parseDate, toISODate } from './DateField';
import { Button, ErrorText, Field, Icon, type IconName, T } from './ui';

type Person = Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'pin_color'>;

type Props = {
  memoryId: string;
  memoryAuthorId: string;
  photos: MemoryPhoto[];
  urls: Record<string, string> | undefined;
  likes: PhotoLike[];
  comments: PhotoComment[];
  people: Person[];
  /** Index de la photo ouverte ; null = visionneuse fermée. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onDelete: (photo: MemoryPhoto) => void;
  deleting: boolean;
};

/** Photos en grand, une par une : swipe (ou flèches), date, légende, likes et commentaires. */
export function PhotoViewer(props: Props) {
  const { photos, index, onClose } = props;
  const open = index !== null && photos.length > 0;
  return (
    <Modal visible={open} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {open ? <ViewerBody {...props} index={Math.min(index, photos.length - 1)} /> : null}
    </Modal>
  );
}

function ViewerBody({
  memoryId,
  memoryAuthorId,
  photos,
  urls,
  likes,
  comments,
  people,
  index,
  onIndexChange,
  onClose,
  onDelete,
  deleting,
}: Props & { index: number }) {
  const uid = useUserId();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const list = useRef<FlatList<MemoryPhoto>>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wide = width >= 760;

  const photo = photos[index];
  const canEdit = photo.uploaded_by === uid || memoryAuthorId === uid;
  const photoLikes = likes.filter((l) => l.photo_id === photo.id);
  const liked = photoLikes.some((l) => l.user_id === uid);
  const photoComments = comments.filter((c) => c.photo_id === photo.id);
  const uploader = people.find((p) => p.id === photo.uploaded_by);

  const toggleLike = useTogglePhotoLike(memoryId);
  const addComment = useAddPhotoComment(memoryId);
  const removeComment = useDeletePhotoComment(memoryId);

  // Hauteur mesurée de la zone photo : une liste horizontale n'étire pas ses éléments en hauteur
  // (sur le web, `height: '100%'` donnait des photos de 0 px, donc invisibles).
  const [areaHeight, setAreaHeight] = useState(0);

  useEffect(() => () => clearTimeout(settle.current ?? undefined), []);

  function go(i: number) {
    const next = Math.max(0, Math.min(photos.length - 1, i));
    list.current?.scrollToIndex({ index: next, animated: true });
    onIndexChange(next);
  }

  // Fin de swipe détectée par un court délai : react-native-web n'émet pas onMomentumScrollEnd.
  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    clearTimeout(settle.current ?? undefined);
    settle.current = setTimeout(() => {
      const i = Math.round(x / width);
      if (i !== index && i >= 0 && i < photos.length) onIndexChange(i);
    }, 120);
  }

  return (
    <View style={styles.root}>
      {/* Barre du haut : fermer, position, supprimer. */}
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <RoundButton icon="x" label={t('common.close')} onPress={onClose} />
        <T style={styles.counter}>
          {index + 1} / {photos.length}
        </T>
        {canEdit ? (
          <RoundButton icon="trash-2" label={t('memory.deletePhoto')} onPress={() => onDelete(photo)} loading={deleting} />
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* La photo en grand. */}
      <View style={{ flex: 1 }} onLayout={(e) => setAreaHeight(e.nativeEvent.layout.height)}>
        {areaHeight > 0 ? (
        <FlatList
          ref={list}
          data={photos}
          keyExtractor={(p) => p.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onScroll={onScroll}
          scrollEventThrottle={32}
          renderItem={({ item }) => (
            <View style={{ width, height: areaHeight, padding: 8 }}>
              {urls?.[item.path] ? (
                <Image source={{ uri: urls[item.path] }} style={{ width: width - 16, height: areaHeight - 16 }} contentFit="contain" transition={150} />
              ) : (
                <ActivityIndicator color="#fff" style={{ flex: 1 }} />
              )}
            </View>
          )}
        />
        ) : null}
        {wide && index > 0 ? (
          <View style={[styles.arrow, { left: 16 }]}>
            <RoundButton icon="chevron-left" label={t('photo.previous')} onPress={() => go(index - 1)} />
          </View>
        ) : null}
        {wide && index < photos.length - 1 ? (
          <View style={[styles.arrow, { right: 16 }]}>
            <RoundButton icon="chevron-right" label={t('photo.next')} onPress={() => go(index + 1)} />
          </View>
        ) : null}
      </View>

      {/* Sous la photo : qui, quand, légende, likes, commentaires. */}
      <View style={[styles.panel, { maxHeight: height * 0.46, paddingBottom: insets.bottom }]}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.panelContent}>
          <PhotoDetails key={photo.id} memoryId={memoryId} photo={photo} uploader={uploader} canEdit={canEdit} />

          <View style={styles.actions}>
            <Pressable
              onPress={() => toggleLike.mutate({ photoId: photo.id, liked })}
              accessibilityRole="button"
              accessibilityState={{ selected: liked }}
              accessibilityLabel={liked ? t('photo.unlike') : t('photo.like')}
              style={[styles.pill, liked && { backgroundColor: colors.accent }]}
            >
              <Icon name="heart" size={16} color={liked ? colors.onAccent : colors.ink} />
              <T style={[styles.pillText, liked && { color: colors.onAccent }]}>{photoLikes.length}</T>
            </Pressable>
            <View style={styles.pill}>
              <Icon name="message-circle" size={16} />
              <T style={styles.pillText}>{photoComments.length}</T>
            </View>
          </View>
          <ErrorText error={toggleLike.error ?? removeComment.error} />

          <CommentList
            comments={photoComments}
            canModerate={memoryAuthorId === uid}
            deletingId={removeComment.isPending ? (removeComment.variables ?? null) : null}
            onDelete={(id) => removeComment.mutate(id)}
          />
          <CommentComposer
            sending={addComment.isPending}
            error={addComment.error}
            onSend={(body, done) => addComment.mutate({ photoId: photo.id, body }, { onSuccess: done })}
          />
        </ScrollView>
      </View>
    </View>
  );
}

/** Auteur de la photo, date et légende ; modifiables par la personne qui l'a ajoutée ou l'auteur du souvenir. */
function PhotoDetails({
  memoryId,
  photo,
  uploader,
  canEdit,
}: {
  memoryId: string;
  photo: MemoryPhoto;
  uploader: Person | undefined;
  canEdit: boolean;
}) {
  const update = useUpdateMemoryPhoto(memoryId);
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState<DateParts>(datePartsFromISO(photo.taken_on));
  const [caption, setCaption] = useState(photo.caption ?? '');
  const parsed = parseDate(date);

  function save() {
    if (parsed === 'invalid') return;
    update.mutate(
      { id: photo.id, taken_on: parsed ? toISODate(parsed) : null, caption },
      { onSuccess: () => setEditing(false) },
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.byline}>
        <Avatar
          name={uploader?.display_name ?? '?'}
          url={uploader?.avatar_url}
          color={uploader?.pin_color ?? pastels[5]}
          size={36}
          ring={2}
        />
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: fonts.semibold }} numberOfLines={1}>
            {uploader?.display_name ?? t('comments.someone')}
          </T>
          <T variant="caption">{photo.taken_on ? formatDate(photo.taken_on) : t('photo.noDate')}</T>
        </View>
        {canEdit && !editing ? (
          <Pressable onPress={() => setEditing(true)} hitSlop={8} style={styles.editLink} accessibilityLabel={t('photo.edit')}>
            <Icon name="edit-2" size={14} color={colors.accent} />
            <T style={{ color: colors.accent, fontFamily: fonts.medium, fontSize: 14 }}>{t('photo.edit')}</T>
          </Pressable>
        ) : null}
      </View>

      {editing ? (
        <View style={{ gap: 10 }}>
          <DateField label={t('photo.date')} value={date} onChange={setDate} />
          <Field
            label={t('photo.caption')}
            value={caption}
            onChangeText={setCaption}
            placeholder={t('photo.captionPlaceholder')}
            multiline
            maxLength={500}
            style={{ minHeight: 64, paddingTop: 12, textAlignVertical: 'top' }}
          />
          <ErrorText error={update.error} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label={t('common.cancel')} kind="ghost" onPress={() => setEditing(false)} style={{ flex: 1 }} />
            <Button label={t('common.save')} onPress={save} loading={update.isPending} disabled={parsed === 'invalid'} style={{ flex: 1 }} />
          </View>
        </View>
      ) : photo.caption ? (
        <T style={styles.caption}>{photo.caption}</T>
      ) : null}
    </View>
  );
}

function RoundButton({ icon, label, onPress, loading }: { icon: IconName; label: string; onPress: () => void; loading?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [styles.round, { opacity: pressed ? 0.7 : 1 }]}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Icon name={icon} size={20} color="#fff" />}
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: '#14110F' },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
    counter: { color: '#fff', fontFamily: fonts.semibold },
    round: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.14)',
    },
    arrow: { position: 'absolute', top: '50%', marginTop: -20 },
    panel: {
      width: '100%',
      maxWidth: 640,
      alignSelf: 'center',
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: colors.paper,
    },
    panelContent: { padding: 20, gap: 14 },
    byline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    editLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    caption: { lineHeight: 22, fontSize: 16 },
    actions: { flexDirection: 'row', gap: 8 },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius.pill,
      backgroundColor: tint(colors.ink, 0.94),
    },
    pillText: { fontFamily: fonts.semibold, fontSize: 14 },
  }),
);
