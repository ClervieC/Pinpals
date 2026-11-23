import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import { useUserId } from '@/lib/auth';
import { t, timeAgo } from '@/lib/i18n';
import { colors, fonts, pastels, radius, themed, tint } from '@/lib/theme';
import type { MemoryComment } from '@/lib/types';

import { Avatar } from './Avatar';
import { ErrorText, Field, Icon, T } from './ui';

/** Ce qu'il faut pour afficher un commentaire (souvenir ou photo). */
export type ThreadComment = Pick<MemoryComment, 'id' | 'author_id' | 'body' | 'created_at' | 'author'>;

const MAX_LENGTH = 1000;

/** Bulles de commentaires. `canModerate` : l'auteur du souvenir peut supprimer tous les commentaires. */
export function CommentList({
  comments,
  canModerate,
  deletingId,
  onDelete,
  emptyLabel,
}: {
  comments: ThreadComment[];
  canModerate: boolean;
  deletingId: string | null;
  onDelete: (id: string) => void;
  emptyLabel?: string;
}) {
  const uid = useUserId();
  if (comments.length === 0) return emptyLabel ? <T variant="caption">{emptyLabel}</T> : null;
  return (
    <View style={{ gap: 12 }}>
      {comments.map((c) => (
        <CommentBubble
          key={c.id}
          comment={c}
          mine={c.author_id === uid}
          canDelete={c.author_id === uid || canModerate}
          deleting={deletingId === c.id}
          onDelete={() => onDelete(c.id)}
        />
      ))}
    </View>
  );
}

function CommentBubble({
  comment,
  mine,
  canDelete,
  deleting,
  onDelete,
}: {
  comment: ThreadComment;
  mine: boolean;
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  const a = comment.author;
  const name = a?.display_name ?? t('comments.someone');

  return (
    <Animated.View entering={FadeInDown.springify().damping(16)} exiting={FadeOut} layout={LinearTransition} style={styles.row}>
      <Avatar name={name} url={a?.avatar_url} color={a?.pin_color ?? pastels[5]} size={34} ring={2} />
      <View style={[styles.bubble, mine && styles.bubbleMine]}>
        <View style={styles.meta}>
          <T style={{ fontFamily: fonts.semibold, fontSize: 14, flexShrink: 1 }} numberOfLines={1}>
            {name}
          </T>
          <T variant="caption" style={{ fontSize: 12 }}>
            {timeAgo(comment.created_at)}
          </T>
          {canDelete ? (
            <Pressable onPress={onDelete} disabled={deleting} hitSlop={8} accessibilityLabel={t('comments.delete')} style={{ marginLeft: 'auto' }}>
              {deleting ? <ActivityIndicator size="small" color={colors.inkSoft} /> : <Icon name="trash-2" size={14} color={colors.inkSoft} />}
            </Pressable>
          ) : null}
        </View>
        <T style={{ lineHeight: 21 }}>{comment.body}</T>
      </View>
    </Animated.View>
  );
}

/** Champ de saisie + bouton d'envoi rond. Le texte est vidé une fois envoyé. */
export function CommentComposer({
  sending,
  error,
  onSend,
}: {
  sending: boolean;
  error: unknown;
  onSend: (body: string, done: () => void) => void;
}) {
  const [draft, setDraft] = useState('');
  const canSend = draft.trim().length > 0 && !sending;

  function send() {
    if (canSend) onSend(draft, () => setDraft(''));
  }

  return (
    <View style={{ gap: 6 }}>
      <View style={styles.composer}>
        <View style={{ flex: 1 }}>
          <Field
            value={draft}
            onChangeText={setDraft}
            placeholder={t('comments.placeholder')}
            accessibilityLabel={t('comments.placeholder')}
            multiline
            maxLength={MAX_LENGTH}
            style={styles.input}
          />
        </View>
        <Pressable
          onPress={send}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel={t('comments.send')}
          style={({ pressed }) => [styles.send, { opacity: !canSend ? 0.4 : pressed ? 0.75 : 1 }]}
        >
          {sending ? <ActivityIndicator color={colors.onAccent} /> : <Icon name="arrow-up" size={20} color={colors.onAccent} />}
        </Pressable>
      </View>
      <ErrorText error={error} />
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    bubble: {
      flex: 1,
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 18,
      borderTopLeftRadius: 6,
      backgroundColor: colors.muted,
    },
    bubbleMine: { backgroundColor: tint(colors.accent, 0.9) },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    input: { minHeight: 44, maxHeight: 120, paddingTop: 12, borderRadius: radius.lg, textAlignVertical: 'top' },
    send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  }),
);
