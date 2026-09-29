import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatDateRange, t } from '@/lib/i18n';
import { useSignedUrls } from '@/lib/queries';
import { colors, fonts, pastels, radius, tint } from '@/lib/theme';
import type { MemorySummary } from '@/lib/types';

import { ErrorText, T } from './ui';

/** Galerie : choix multiple, JPEG compressé en base64 (même pipeline que les avatars). */
export async function pickPhotos(): Promise<{ base64: string; mimeType: string }[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 10,
    quality: 0.6,
    base64: true,
  });
  if (result.canceled) return [];
  // `base64` est toujours du JPEG, quel que soit le format d'origine.
  return result.assets.flatMap((a) => (a.base64 ? [{ base64: a.base64, mimeType: 'image/jpeg' }] : []));
}

// Une légère rotation par souvenir, stable d'un rendu à l'autre : effet scrapbook.
function tilt(id: string): number {
  const n = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return ((n % 5) - 2) * 0.8;
}

function paperColor(id: string): string {
  const n = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return tint(pastels[n % pastels.length], 0.7);
}

export function MemoryCard({ memory, coverUrl }: { memory: MemorySummary; coverUrl?: string }) {
  const when = formatDateRange(memory.happened_on, memory.ends_on);
  return (
    <Link href={{ pathname: '/memory/[id]', params: { id: memory.id } }} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.polaroid,
          { transform: [{ rotate: `${tilt(memory.id)}deg` }, { scale: pressed ? 0.98 : 1 }] },
        ]}
      >
        <View style={[styles.photo, { backgroundColor: paperColor(memory.id) }]}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
          ) : (
            <T style={{ fontSize: 44 }}>{memory.kind === 'trip' ? '✈️' : '📸'}</T>
          )}
          {memory.photo_count > 1 ? (
            <View style={styles.count}>
              <T style={{ fontFamily: fonts.bold, fontSize: 12 }}>📷 {memory.photo_count}</T>
            </View>
          ) : null}
        </View>
        <T style={styles.title} numberOfLines={1}>
          {memory.kind === 'trip' ? '✈️ ' : ''}
          {memory.title}
        </T>
        {when || memory.place ? (
          <T variant="caption" numberOfLines={1}>
            {[memory.place, when].filter(Boolean).join(' · ')}
          </T>
        ) : null}
      </Pressable>
    </Link>
  );
}

/** Grille de polaroids, deux par ligne. */
export function MemoryGrid({ memories, error }: { memories: MemorySummary[]; error?: unknown }) {
  const covers = memories.flatMap((m) => (m.cover_path ? [m.cover_path] : []));
  const urls = useSignedUrls(covers);

  return (
    <View style={{ gap: 12 }}>
      <ErrorText error={error ?? urls.error} />
      <View style={styles.grid}>
        {memories.map((m) => (
          <View key={m.id} style={styles.cell}>
            <MemoryCard memory={m} coverUrl={m.cover_path ? urls.data?.[m.cover_path] : undefined} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function EmptyMemories({ hint }: { hint?: string }) {
  return (
    <View style={styles.empty}>
      <T style={{ fontSize: 48 }}>📔</T>
      <T variant="heading" style={{ textAlign: 'center' }}>
        {t('memories.empty.title')}
      </T>
      <T style={{ textAlign: 'center', color: colors.inkSoft }}>{hint ?? t('memories.empty.body')}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  cell: { width: '50%', padding: 6 },
  polaroid: {
    backgroundColor: colors.paper,
    padding: 8,
    paddingBottom: 12,
    borderRadius: 6,
    gap: 4,
    shadowColor: '#5E5169',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  photo: {
    aspectRatio: 1,
    borderRadius: 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
  },
  title: { fontFamily: fonts.black, fontSize: 15, marginTop: 4 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 32 },
});
