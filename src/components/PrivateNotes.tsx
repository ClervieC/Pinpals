import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import { t } from '@/lib/i18n';
import { useAddFriendNote, useDeleteFriendNote, useFriendPrivateNotes, useUpdateFriendNote } from '@/lib/queries';
import { colors, fonts, pastels, radius, shade, themed, tint } from '@/lib/theme';
import type { FriendNoteInput, FriendNoteKind, FriendPrivateNote } from '@/lib/types';

import { Button, ErrorText, Field, Icon, type IconName, T } from './ui';

const KINDS: Record<FriendNoteKind, { icon: IconName; color: string; label: () => string; placeholder: () => string }> = {
  note: { icon: 'edit-3', color: pastels[6], label: () => t('notes.kind.note'), placeholder: () => t('notes.placeholder.note') },
  gift: { icon: 'gift', color: pastels[1], label: () => t('notes.kind.gift'), placeholder: () => t('notes.placeholder.gift') },
  address: { icon: 'home', color: pastels[4], label: () => t('notes.kind.address'), placeholder: () => t('notes.placeholder.address') },
};
const KIND_ORDER: FriendNoteKind[] = ['gift', 'address', 'note'];

/** Mes notes sur un·e ami·e : autant qu'on veut, rangées par type. Visibles uniquement par moi. */
export function PrivateNotes({ friendId }: { friendId: string }) {
  const notes = useFriendPrivateNotes(friendId);
  const add = useAddFriendNote(friendId);
  const update = useUpdateFriendNote(friendId);
  const remove = useDeleteFriendNote(friendId);
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const list = notes.data ?? [];
  // Rangées par type (cadeaux, adresses, notes) pour bien séparer les choses.
  const grouped = KIND_ORDER.map((kind) => ({ kind, items: list.filter((n) => n.kind === kind) })).filter((g) => g.items.length);

  return (
    <View style={{ gap: 14 }}>
      <ErrorText error={notes.error ?? remove.error} />

      {notes.isPending ? null : list.length === 0 && !composing ? <T variant="caption">{t('notes.empty')}</T> : null}

      {grouped.map(({ kind, items }) => (
        <View key={kind} style={{ gap: 8 }}>
          <T variant="label" style={styles.groupTitle}>
            {KINDS[kind].label()}
          </T>
          {items.map((note) =>
            editingId === note.id ? (
              <NoteEditor
                key={note.id}
                initial={note}
                saving={update.isPending}
                error={update.error}
                onCancel={() => setEditingId(null)}
                onSave={(input) => update.mutate({ id: note.id, ...input }, { onSuccess: () => setEditingId(null) })}
              />
            ) : (
              <NoteItem
                key={note.id}
                note={note}
                deleting={remove.isPending && remove.variables === note.id}
                onEdit={() => {
                  setComposing(false);
                  setEditingId(note.id);
                }}
                onDelete={() => remove.mutate(note.id)}
              />
            ),
          )}
        </View>
      ))}

      {composing ? (
        <NoteEditor
          saving={add.isPending}
          error={add.error}
          onCancel={() => setComposing(false)}
          onSave={(input) => add.mutate(input, { onSuccess: () => setComposing(false) })}
        />
      ) : (
        <Button
          label={t('notes.add')}
          kind="secondary"
          icon="plus"
          onPress={() => {
            setEditingId(null);
            setComposing(true);
          }}
        />
      )}
    </View>
  );
}

function NoteItem({
  note,
  deleting,
  onEdit,
  onDelete,
}: {
  note: FriendPrivateNote;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const kind = KINDS[note.kind];
  // Suppression en deux temps : Alert n'est pas fiable sur le web.
  const [armed, setArmed] = useState(false);

  return (
    <Animated.View entering={FadeInDown.springify().damping(16)} exiting={FadeOut} layout={LinearTransition} style={[styles.item, { backgroundColor: tint(kind.color, 0.88) }]}>
      <View style={[styles.badge, { backgroundColor: tint(kind.color, 0.55) }]}>
        <Icon name={kind.icon} size={16} color={shade(kind.color, 0.35)} />
      </View>
      <T selectable style={{ flex: 1, lineHeight: 21, paddingTop: 5 }}>
        {note.body}
      </T>
      <View style={styles.actions}>
        {armed ? (
          <Animated.View entering={FadeIn} style={styles.actions}>
            <Pressable onPress={() => setArmed(false)} hitSlop={6} accessibilityLabel={t('common.cancel')}>
              <Icon name="x" size={16} color={colors.inkSoft} />
            </Pressable>
            <Pressable onPress={onDelete} disabled={deleting} hitSlop={6} style={styles.confirm}>
              {deleting ? (
                <ActivityIndicator size="small" color={colors.onAccent} />
              ) : (
                <T style={styles.confirmText}>{t('notes.deleteConfirm')}</T>
              )}
            </Pressable>
          </Animated.View>
        ) : (
          <>
            <Pressable onPress={onEdit} hitSlop={6} accessibilityLabel={t('notes.edit')}>
              <Icon name="edit-2" size={15} color={colors.inkSoft} />
            </Pressable>
            <Pressable onPress={() => setArmed(true)} hitSlop={6} accessibilityLabel={t('notes.delete')}>
              <Icon name="trash-2" size={15} color={colors.inkSoft} />
            </Pressable>
          </>
        )}
      </View>
    </Animated.View>
  );
}

function NoteEditor({
  initial,
  saving,
  error,
  onCancel,
  onSave,
}: {
  initial?: FriendNoteInput;
  saving: boolean;
  error: unknown;
  onCancel: () => void;
  onSave: (input: FriendNoteInput) => void;
}) {
  const [kind, setKind] = useState<FriendNoteKind>(initial?.kind ?? 'note');
  const [body, setBody] = useState(initial?.body ?? '');
  const meta = KINDS[kind];

  return (
    <Animated.View entering={FadeInDown.springify().damping(16)} style={[styles.editor, { borderColor: tint(meta.color, 0.4) }]}>
      <View style={styles.kinds}>
        {KIND_ORDER.map((k) => {
          const on = k === kind;
          return (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.kind, { backgroundColor: on ? KINDS[k].color : colors.muted }]}
            >
              <Icon name={KINDS[k].icon} size={14} color={on ? colors.onAccent : colors.inkSoft} />
              <T style={[styles.kindText, on && { color: colors.onAccent }]}>{KINDS[k].label()}</T>
            </Pressable>
          );
        })}
      </View>
      <Field
        value={body}
        onChangeText={setBody}
        placeholder={meta.placeholder()}
        multiline
        maxLength={2000}
        autoFocus
        style={styles.input}
      />
      {kind === 'address' ? <T variant="caption">{t('notes.addressHint')}</T> : null}
      <ErrorText error={error} />
      <View style={styles.editorActions}>
        <Button label={t('common.cancel')} kind="ghost" onPress={onCancel} style={{ flex: 1 }} />
        <Button
          label={t('common.save')}
          loading={saving}
          disabled={!body.trim()}
          onPress={() => onSave({ kind, body })}
          style={{ flex: 1 }}
        />
      </View>
    </Animated.View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    groupTitle: { textTransform: 'uppercase', letterSpacing: 0.6, fontSize: 12 },
    item: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 10, borderRadius: radius.lg },
    badge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8, paddingRight: 4 },
    confirm: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.danger },
    confirmText: { color: colors.onAccent, fontFamily: fonts.semibold, fontSize: 13 },
    editor: { gap: 12, padding: 12, borderRadius: radius.lg, borderWidth: 1.5, backgroundColor: colors.paper },
    kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    kind: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill },
    kindText: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft },
    input: { minHeight: 80, paddingTop: 12, textAlignVertical: 'top' },
    editorActions: { flexDirection: 'row', gap: 8 },
  }),
);
