import * as ImagePicker from 'expo-image-picker';
import { Link } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { formatDateRange, t } from '@/lib/i18n';
import { useSignedUrls } from '@/lib/queries';
import { colors, pastels, shade, themed, tint } from '@/lib/theme';
import type { MemorySummary } from '@/lib/types';

import { AddTile, Chip, Grid } from './Tiles';
import { Polaroid } from './Polaroid';
import { cardShadow, EmptyState, ErrorText, Icon, T } from './ui';

export type PickedPhoto = { base64: string; mimeType: string; uri: string };

/** Galerie : choix multiple, compressé en base64 (même pipeline que les avatars). */
export async function pickPhotos(): Promise<PickedPhoto[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 10,
    quality: 0.6,
    base64: true,
  });
  if (result.canceled) return [];
  // Sur mobile, `base64` est toujours du JPEG ; sur le web, c'est le fichier d'origine.
  return result.assets.flatMap((a) =>
    a.base64
      ? [{ base64: a.base64, uri: a.uri, mimeType: Platform.OS === 'web' ? (a.mimeType ?? 'image/jpeg') : 'image/jpeg' }]
      : [],
  );
}

// Une couleur par souvenir, stable d'un rendu à l'autre, pour les couvertures sans photo.
export function colorFor(id: string): string {
  const n = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return pastels[n % pastels.length];
}

export function MemoryCard({ memory, coverUrl }: { memory: MemorySummary; coverUrl?: string }) {
  const when = formatDateRange(memory.happened_on, memory.ends_on);
  const color = colorFor(memory.id);
  return (
    // Style statique : sur le web, Link asChild ne transmet pas un style en fonction.
    <Link href={{ pathname: '/memory/[id]', params: { id: memory.id } }} asChild>
      <Pressable style={styles.card}>
        <View style={styles.clip}>
        <View style={[styles.cover, { backgroundColor: tint(color, 0.55) }]}>
          {/* Couverture façon scrapbook : un polaroïd scotché, penché d'un côté ou de l'autre. */}
          <Polaroid
            uri={coverUrl}
            color={color}
            width={104}
            rotate={memory.id.charCodeAt(0) % 2 ? 5 : -5}
            icon={memory.kind === 'trip' ? 'navigation' : 'camera'}
          />
          <View style={styles.badges}>
            {memory.kind === 'trip' ? (
              <Chip icon="navigation" label={t('memory.kind.trip')} tone="accent" />
            ) : null}
            {memory.photo_count > 0 ? <Chip icon="image" label={String(memory.photo_count)} /> : null}
          </View>
        </View>
        <View style={styles.body}>
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="heading" style={{ fontSize: 20 }} numberOfLines={1}>
              {memory.title}
            </T>
            {when || memory.place ? (
              <T variant="caption" numberOfLines={1}>
                {[memory.place, when].filter(Boolean).join(' · ')}
              </T>
            ) : null}
          </View>
          <View style={[styles.arrow, { backgroundColor: tint(color, 0.75) }]}>
            <Icon name="arrow-up-right" size={18} color={shade(color, 0.45)} />
          </View>
        </View>
        </View>
      </Pressable>
    </Link>
  );
}

/** Grille de souvenirs (deux colonnes sur grand écran), avec la tuile d'ajout en dernier. */
export function MemoryGrid({
  memories,
  error,
  onAdd,
}: {
  memories: MemorySummary[];
  error?: unknown;
  onAdd?: () => void;
}) {
  const covers = memories.flatMap((m) => (m.cover_path ? [m.cover_path] : []));
  const urls = useSignedUrls(covers);

  return (
    <View style={{ gap: 12 }}>
      <ErrorText error={error ?? urls.error} />
      <Grid>
        {memories.map((m) => (
          <MemoryCard key={m.id} memory={m} coverUrl={m.cover_path ? urls.data?.[m.cover_path] : undefined} />
        ))}
        {onAdd ? <AddTile label={t('memories.add')} body={t('memories.addBody')} icon="camera" onPress={onAdd} /> : null}
      </Grid>
    </View>
  );
}

/** Souvenir mis en avant (le plus récent) : ses premières photos en éventail sur un grand bandeau. */
export function FeaturedMemory({ memory }: { memory: MemorySummary }) {
  const urls = useSignedUrls(memory.photo_paths);
  const color = colorFor(memory.id);
  const when = formatDateRange(memory.happened_on, memory.ends_on);
  const tilts = [-7, 4, -3];

  return (
    <Link href={{ pathname: '/memory/[id]', params: { id: memory.id } }} asChild>
      <Pressable style={styles.card}>
        <View style={styles.clip}>
        <View style={[styles.featuredCover, { backgroundColor: tint(color, 0.55) }]}>
          {memory.photo_paths.length ? (
            <View style={styles.fan}>
              {memory.photo_paths.map((path, i) => (
                <Polaroid
                  key={path}
                  uri={urls.data?.[path]}
                  color={color}
                  width={104}
                  rotate={tilts[i]}
                  style={{ marginTop: i === 1 ? -14 : 0 }}
                />
              ))}
            </View>
          ) : (
            <Icon name={memory.kind === 'trip' ? 'navigation' : 'camera'} size={40} color={shade(color, 0.15)} />
          )}
          <View style={styles.badges}>
            {memory.kind === 'trip' ? <Chip icon="navigation" label={t('memory.kind.trip')} tone="accent" /> : null}
            {memory.photo_count > 0 ? <Chip icon="image" label={String(memory.photo_count)} /> : null}
          </View>
        </View>
        <View style={styles.body}>
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="title" style={{ fontSize: 24, lineHeight: 28 }} numberOfLines={1}>
              {memory.title}
            </T>
            {when || memory.place ? (
              <T variant="caption" numberOfLines={1}>
                {[memory.place, when].filter(Boolean).join(' · ')}
              </T>
            ) : null}
          </View>
          <View style={[styles.arrow, { backgroundColor: tint(color, 0.75) }]}>
            <Icon name="arrow-up-right" size={18} color={shade(color, 0.45)} />
          </View>
        </View>
        </View>
      </Pressable>
    </Link>
  );
}

export function EmptyMemories({ hint }: { hint?: string }) {
  return (
    <EmptyState
      icon="camera"
      color={pastels[6]}
      title={t('memories.empty.title')}
      body={hint ?? t('memories.empty.body')}
    />
  );
}

const styles = themed(() =>
  StyleSheet.create({
    // Ombre dehors, découpe dedans : sur iOS, overflow hidden coupe aussi l'ombre.
    card: { borderRadius: 24, backgroundColor: colors.paper, ...cardShadow },
    clip: { borderRadius: 24, overflow: 'hidden' },
    cover: { height: 170, alignItems: 'center', justifyContent: 'center' },
    badges: { position: 'absolute', left: 12, top: 12, flexDirection: 'row', gap: 6 },
    body: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, padding: 16 },
    arrow: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    featuredCover: { height: 220, alignItems: 'center', justifyContent: 'center' },
    fan: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  }),
);
