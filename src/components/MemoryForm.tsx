import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { countryFlag } from '@/lib/geo';
import { t } from '@/lib/i18n';
import { useFriends, useGroupMembers, useMyGroups } from '@/lib/queries';
import { colors, fonts, radius, tint } from '@/lib/theme';
import type { Memory, MemoryInput, MemoryKind, MemoryStop } from '@/lib/types';

import { CitySearch } from './CitySearch';
import { DateField, datePartsFromISO, parseDate, toISODate } from './DateField';
import { FriendPicker } from './FriendPicker';
import { type PickedPhoto, pickPhotos } from './Memories';
import { Button, ErrorText, Field, Icon, SectionCard, Segmented, T } from './ui';

export type MemoryFormValues = MemoryInput & { groupId: string | null; people: string[]; photos: PickedPhoto[]; stops: MemoryStop[] };

type Props = {
  /** Édition : le groupe d'un souvenir existant ne peut plus changer. */
  initial?: Memory & { people: string[]; stops: MemoryStop[] };
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
  // Juste la ville (centre-ville), jamais d'adresse : une pour un souvenir, plusieurs pour un voyage.
  const [stops, setStops] = useState<MemoryStop[]>(initial?.stops ?? []);
  const [searching, setSearching] = useState(false);
  const [body, setBody] = useState(initial?.body ?? '');
  const [start, setStart] = useState(datePartsFromISO(initial?.happened_on));
  const [end, setEnd] = useState(datePartsFromISO(initial?.ends_on));
  const [groupId, setGroupId] = useState<string | null>(initial ? initial.group_id : (defaultGroupId ?? null));
  const [people, setPeople] = useState<string[]>(initial?.people ?? defaultPeople ?? []);
  // Création seulement : en édition, les photos se gèrent depuis la page du souvenir.
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);

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
      // Libellé affiché partout : les villes, dans l'ordre du trajet.
      place: stopsFor(kind, stops).map((st) => st.name).join(' → ') || null,
      stops: stopsFor(kind, stops),
      body: body.trim() || null,
      happened_on: iso(parsedStart),
      ends_on: kind === 'trip' ? iso(parsedEnd) : null,
      groupId,
      people: people.filter((p) => candidates.some((c) => c.id === p)),
      photos,
    });
  }

  function pickGroup(id: string | null) {
    setGroupId(id);
    setPeople([]);
  }

  return (
    <View style={{ gap: 16 }}>
      <SectionCard icon="book-open" title={t('memory.section.story')}>
        <Segmented
          options={[
            { value: 'memory', label: t('memory.kind.memory') },
            { value: 'trip', label: t('memory.kind.trip') },
          ]}
          value={kind}
          onChange={setKind}
        />

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
          label={t('memory.body')}
          value={body}
          onChangeText={setBody}
          placeholder={t('memory.bodyPlaceholder')}
          multiline
          maxLength={5000}
          style={{ minHeight: 110, paddingTop: 12, textAlignVertical: 'top' }}
        />
      </SectionCard>

      <SectionCard icon="map-pin" title={kind === 'trip' ? t('memory.where.trip') : t('memory.where.memory')}>
        <T variant="caption">{kind === 'trip' ? t('memory.where.tripHint') : t('memory.where.memoryHint')}</T>
        {stopsFor(kind, stops).map((stop, i, all) => (
          <View key={`${stop.name}-${i}`} style={styles.stop}>
            <View style={styles.stopDot}>
              <T style={styles.stopNumber}>{kind === 'trip' ? i + 1 : ''}</T>
            </View>
            {kind === 'trip' && i < all.length - 1 ? <View style={styles.stopLine} /> : null}
            <T style={{ flex: 1, fontFamily: fonts.medium }}>
              {countryFlag(stop.country_code)} {stop.name}
            </T>
            <Pressable
              onPress={() => setStops((ss) => ss.filter((_, j) => j !== i))}
              hitSlop={8}
              accessibilityLabel={t('memory.where.remove', { name: stop.name })}
            >
              <Icon name="x" size={16} color={colors.inkSoft} />
            </Pressable>
          </View>
        ))}
        {searching ? (
          <>
            <CitySearch
              onSelect={(city) => {
                const stop = { name: city.name, country_code: city.countryCode, lat: city.lat, lng: city.lng };
                setStops((ss) => (kind === 'trip' ? [...ss, stop].slice(0, 20) : [stop]));
                setSearching(false);
              }}
            />
            <Button label={t('common.cancel')} kind="ghost" onPress={() => setSearching(false)} />
          </>
        ) : kind === 'trip' || stops.length === 0 ? (
          <Button
            label={stops.length ? t('memory.where.addStop') : t('memory.where.add')}
            kind="secondary"
            icon="plus"
            onPress={() => setSearching(true)}
          />
        ) : (
          <Button label={t('memory.where.change')} kind="ghost" onPress={() => setSearching(true)} />
        )}
      </SectionCard>

      <SectionCard icon="users" title={t('memory.audience')}>
        {editing ? (
          <T variant="caption">
            {groupId
              ? t('memory.inGroup', { name: groups.data?.find((g) => g.id === groupId)?.name ?? '' })
              : t('memory.privateBetween')}
          </T>
        ) : (
          <View style={styles.chips}>
            <Pressable onPress={() => pickGroup(null)} style={[styles.chip, !groupId && styles.chipOn]}>
              <T style={styles.chipText}>{t('memory.audienceFriends')}</T>
            </Pressable>
            {groups.data?.map((g) => (
              <Pressable
                key={g.id}
                onPress={() => pickGroup(g.id)}
                style={[styles.chip, groupId === g.id && styles.chipOn]}
              >
                <T style={styles.chipText}>
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
      </SectionCard>

      {editing ? null : (
        <SectionCard icon="image" title={t('memory.photos', { count: photos.length })}>
          <View style={styles.photos}>
            {photos.map((photo, i) => (
              <View key={photo.uri + i} style={styles.photoCell}>
                <Image source={{ uri: photo.uri }} style={styles.photo} contentFit="cover" />
                <Pressable
                  onPress={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}
                  hitSlop={6}
                  accessibilityLabel={t('memory.deletePhoto')}
                  style={styles.remove}
                >
                  <Icon name="x" size={13} color={colors.onAccent} />
                </Pressable>
              </View>
            ))}
            <Pressable
              onPress={async () => {
                const picked = await pickPhotos();
                setPhotos((ps) => [...ps, ...picked].slice(0, 20));
              }}
              style={styles.photoCell}
            >
              <View style={[styles.photo, styles.addTile]}>
                <Icon name="camera" size={22} color={colors.accent} />
                <T variant="caption" style={{ color: colors.accent, fontFamily: fonts.medium }}>
                  {t('memory.addPhotos')}
                </T>
              </View>
            </Pressable>
          </View>
          <T variant="caption">{t('memory.photosHint')}</T>
        </SectionCard>
      )}

      <ErrorText error={error} />
      <Button label={submitLabel} loading={loading} disabled={!canSubmit} onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stop: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  stopDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  stopNumber: { color: colors.onAccent, fontFamily: fonts.bold, fontSize: 12 },
  // Trait pointillé entre deux étapes d'un voyage.
  stopLine: {
    position: 'absolute',
    left: 12,
    top: 32,
    height: 20,
    borderLeftWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.accent,
  },
  photos: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  photoCell: { width: '25%', padding: 4 },
  photo: { width: '100%', aspectRatio: 1, borderRadius: radius.sm },
  addTile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: tint(colors.accent, 0.4),
    backgroundColor: tint(colors.accent, 0.92),
  },
  remove: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  chipOn: { borderColor: colors.accent, backgroundColor: tint(colors.accent, 0.9) },
  chipText: { fontFamily: fonts.medium, fontSize: 14 },
});

/** Un souvenir n'a qu'une ville ; si on repasse de « voyage » à « souvenir », on garde la première. */
function stopsFor(kind: MemoryKind, stops: MemoryStop[]): MemoryStop[] {
  return kind === 'trip' ? stops : stops.slice(0, 1);
}
