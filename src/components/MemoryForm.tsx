import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { t } from '@/lib/i18n';
import { useFriends, useGroupMembers, useMyGroups } from '@/lib/queries';
import { colors, fonts, radius, tint } from '@/lib/theme';
import type { Memory, MemoryInput, MemoryKind } from '@/lib/types';

import { DateField, datePartsFromISO, parseDate, toISODate } from './DateField';
import { FriendPicker } from './FriendPicker';
import { Button, ErrorText, Field, T } from './ui';

export type MemoryFormValues = MemoryInput & { groupId: string | null; people: string[] };

type Props = {
  /** Édition : le groupe d'un souvenir existant ne peut plus changer. */
  initial?: Memory & { people: string[] };
  defaultGroupId?: string | null;
  defaultPeople?: string[];
  submitLabel: string;
  loading: boolean;
  error: unknown;
  onSubmit: (values: MemoryFormValues) => void;
};

export function MemoryForm({ initial, defaultGroupId, defaultPeople, submitLabel, loading, error, onSubmit }: Props) {
  const editing = !!initial;
  const [kind, setKind] = useState<MemoryKind>(initial?.kind ?? 'memory');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [place, setPlace] = useState(initial?.place ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [start, setStart] = useState(datePartsFromISO(initial?.happened_on));
  const [end, setEnd] = useState(datePartsFromISO(initial?.ends_on));
  const [groupId, setGroupId] = useState<string | null>(initial ? initial.group_id : (defaultGroupId ?? null));
  const [people, setPeople] = useState<string[]>(initial?.people ?? defaultPeople ?? []);

  const groups = useMyGroups();
  const friends = useFriends();
  const members = useGroupMembers(groupId ?? '');

  // Dans un groupe, on ne tague que ses membres ; sinon, n'importe quel·le ami·e.
  const candidates = groupId
    ? (members.data ?? [])
        .map((m) => m.profile)
        .filter((p) => friends.data?.some((f) => f.id === p.id))
    : (friends.data ?? []);

  const parsedStart = parseDate(start);
  const parsedEnd = kind === 'trip' ? parseDate(end) : null;
  const rangeInvalid =
    parsedEnd !== null &&
    parsedEnd !== 'invalid' &&
    (parsedStart === null || (parsedStart !== 'invalid' && toISODate(parsedEnd) < toISODate(parsedStart)));
  const datesInvalid = parsedStart === 'invalid' || parsedEnd === 'invalid' || rangeInvalid;
  const audienceMissing = !groupId && people.length === 0;
  const canSubmit = !!title.trim() && !datesInvalid && !audienceMissing;

  function submit() {
    if (!canSubmit) return;
    const iso = (p: ReturnType<typeof parseDate>) => (p && p !== 'invalid' ? toISODate(p) : null);
    onSubmit({
      kind,
      title: title.trim(),
      place: place.trim() || null,
      body: body.trim() || null,
      happened_on: iso(parsedStart),
      ends_on: kind === 'trip' ? iso(parsedEnd) : null,
      groupId,
      people: people.filter((p) => candidates.some((c) => c.id === p)),
    });
  }

  function pickGroup(id: string | null) {
    setGroupId(id);
    setPeople([]);
  }

  return (
    <View style={{ gap: 20 }}>
      <View style={styles.segment}>
        {(['memory', 'trip'] as const).map((k) => (
          <Pressable key={k} onPress={() => setKind(k)} style={[styles.segmentItem, kind === k && styles.segmentOn]}>
            <T style={{ fontFamily: fonts.bold }}>{k === 'trip' ? t('memory.kind.trip') : t('memory.kind.memory')}</T>
          </Pressable>
        ))}
      </View>

      <Field
        label={t('memory.title')}
        value={title}
        onChangeText={setTitle}
        placeholder={kind === 'trip' ? t('memory.titlePlaceholderTrip') : t('memory.titlePlaceholder')}
        maxLength={100}
      />
      <DateField label={kind === 'trip' ? t('memory.from') : t('memory.date')} value={start} onChange={setStart} />
      {kind === 'trip' ? <DateField label={t('memory.to')} value={end} onChange={setEnd} /> : null}
      {rangeInvalid ? (
        <T variant="caption">{t('memory.badRange')}</T>
      ) : null}
      <Field
        label={t('memory.place')}
        value={place}
        onChangeText={setPlace}
        placeholder={t('memory.placePlaceholder')}
        maxLength={100}
      />
      <Field
        label={t('memory.body')}
        value={body}
        onChangeText={setBody}
        placeholder={t('memory.bodyPlaceholder')}
        multiline
        maxLength={5000}
        style={{ minHeight: 110, paddingTop: 12, textAlignVertical: 'top' }}
      />

      <View style={{ gap: 10 }}>
        <T variant="label">{t('memory.audience')}</T>
        {editing ? (
          <T variant="caption">
            {groupId
              ? t('memory.inGroup', { name: groups.data?.find((g) => g.id === groupId)?.name ?? '' })
              : t('memory.privateBetween')}
          </T>
        ) : (
          <View style={styles.chips}>
            <Pressable onPress={() => pickGroup(null)} style={[styles.chip, !groupId && styles.chipOn]}>
              <T style={{ fontFamily: fonts.bold }}>{t('memory.audienceFriends')}</T>
            </Pressable>
            {groups.data?.map((g) => (
              <Pressable
                key={g.id}
                onPress={() => pickGroup(g.id)}
                style={[styles.chip, groupId === g.id && { backgroundColor: tint(g.color, 0.3), borderColor: g.color }]}
              >
                <T style={{ fontFamily: fonts.bold }}>
                  {g.emoji} {g.name}
                </T>
              </Pressable>
            ))}
          </View>
        )}
        <T variant="caption">{groupId ? t('memory.whoWasThere') : t('memory.shareWith')}</T>
        {candidates.length ? (
          <FriendPicker friends={candidates} selected={people} onChange={setPeople} />
        ) : (
          <T variant="caption">{t('memory.noFriends')}</T>
        )}
      </View>

      <ErrorText error={error} />
      <Button label={submitLabel} loading={loading} disabled={!canSubmit} onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', padding: 4, borderRadius: radius.pill, backgroundColor: colors.line },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill },
  segmentOn: { backgroundColor: colors.paper },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  chipOn: { backgroundColor: tint(colors.pink, 0.4), borderColor: colors.pink },
});
