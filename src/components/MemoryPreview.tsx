import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { formatDateRange, t } from '@/lib/i18n';
import { colors, radius, shade, themed, tint } from '@/lib/theme';
import type { MemorySummary } from '@/lib/types';

import { colorFor } from './Memories';
import { SwipePager } from './SwipePager';
import { Chip } from './Tiles';
import { Icon, T } from './ui';

/** Sur grand écran, la fiche ne s'étire pas : largeur max, centrée (comme celle des ami·es). */
const MAX_WIDTH = 560;

/**
 * Aperçu du souvenir sélectionné sur la carte. Swipe horizontal (ou flèches sur ordinateur)
 * pour passer au souvenir suivant : la sélection suit, et la carte recentre sa vignette.
 */
export function MemoryPreview({
  memories,
  selectedId,
  onSelect,
  photoUrls,
  onClose,
  bottomInset,
}: {
  /** Les souvenirs placés sur la carte, dans l'ordre de défilement. */
  memories: MemorySummary[];
  selectedId: string;
  onSelect: (id: string) => void;
  photoUrls: Record<string, string> | undefined;
  onClose: () => void;
  bottomInset: number;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.min(screenWidth, MAX_WIDTH);

  return (
    <View style={[styles.sheet, { paddingBottom: memories.length > 1 ? bottomInset : bottomInset + 16 }]}>
      <View style={styles.handle} />
      <View style={{ width, alignSelf: 'center' }}>
        <SwipePager
          items={memories}
          index={memories.findIndex((m) => m.id === selectedId)}
          width={width}
          keyExtractor={(m) => m.id}
          renderItem={(m) => <MemoryCard memory={m} photoUrls={photoUrls} />}
          onChange={(m) => onSelect(m.id)}
          previousLabel={t('memory.previous')}
          nextLabel={t('memory.next')}
        />
      </View>
      <Pressable onPress={onClose} accessibilityLabel={t('common.close')} hitSlop={8} style={styles.close}>
        <Icon name="x" size={16} />
      </Pressable>
    </View>
  );
}

function MemoryCard({ memory, photoUrls }: { memory: MemorySummary; photoUrls: Record<string, string> | undefined }) {
  const color = colorFor(memory.id);
  const when = formatDateRange(memory.happened_on, memory.ends_on);

  return (
    <View style={styles.card}>
      {memory.photo_paths.length ? (
        <View style={styles.strip}>
          {memory.photo_paths.map((path) =>
            photoUrls?.[path] ? (
              <Image key={path} source={{ uri: photoUrls[path] }} style={styles.photo} contentFit="cover" />
            ) : (
              <View key={path} style={[styles.photo, { backgroundColor: tint(color, 0.6) }]} />
            ),
          )}
        </View>
      ) : null}
      <View style={styles.body}>
        <View style={{ flex: 1, gap: 6 }}>
          <T variant="title" style={{ fontSize: 24, lineHeight: 28 }} numberOfLines={1}>
            {memory.title}
          </T>
          <View style={styles.chips}>
            {when ? <Chip icon="calendar" label={when} /> : null}
            {memory.kind === 'trip' && memory.stops.length > 1 ? (
              <Chip icon="navigation" label={t('memory.stopsCount', { count: memory.stops.length })} />
            ) : memory.stops[0] ? (
              <Chip icon="map-pin" label={memory.stops[0].name} />
            ) : null}
            {memory.photo_count ? <Chip icon="image" label={String(memory.photo_count)} /> : null}
          </View>
        </View>
        {/* Link asChild (web) : style aplati, jamais un tableau ni une fonction. */}
        <Link href={{ pathname: '/memory/[id]', params: { id: memory.id } }} asChild>
          <Pressable accessibilityLabel={t('memory.open')} style={StyleSheet.flatten([styles.open, { backgroundColor: tint(color, 0.75) }])}>
            <Icon name="arrow-up-right" size={18} color={shade(color, 0.45)} />
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: 10,
      gap: 12,
      backgroundColor: colors.paper,
      borderTopLeftRadius: radius.lg + 8,
      borderTopRightRadius: radius.lg + 8,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: -6 },
      elevation: 12,
    },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line },
    card: { paddingHorizontal: 20, gap: 12 },
    strip: { flexDirection: 'row', gap: 6 },
    photo: { flex: 1, height: 90, borderRadius: radius.md },
    body: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    open: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    close: {
      position: 'absolute',
      top: 14,
      right: 16,
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.paper,
    },
  }),
);
