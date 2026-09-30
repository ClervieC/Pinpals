import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatDateRange, monthName, t } from '@/lib/i18n';
import { useSignedUrls } from '@/lib/queries';
import { colors, fonts, radius, tint } from '@/lib/theme';
import type { MemorySummary } from '@/lib/types';

import { colorFor } from './Memories';
import { Chip } from './Tiles';
import { ErrorText, T } from './ui';

/** Date de référence d'un souvenir : sa date, sinon sa création. */
function dateOf(m: MemorySummary): Date {
  return new Date(m.happened_on ?? m.created_at);
}

type Section = { year: number; months: { month: number; items: MemorySummary[] }[] };

/** Regroupe par année puis par mois, du plus récent au plus ancien (l'ordre de get_memories). */
function sections(memories: MemorySummary[]): Section[] {
  const out: Section[] = [];
  for (const m of memories) {
    const d = dateOf(m);
    let year = out.find((s) => s.year === d.getFullYear());
    if (!year) out.push((year = { year: d.getFullYear(), months: [] }));
    let month = year.months.find((x) => x.month === d.getMonth());
    if (!month) year.months.push((month = { month: d.getMonth(), items: [] }));
    month.items.push(m);
  }
  return out;
}

/** Fil chronologique d'un groupe : années en grand, un point par souvenir, bande de photos. */
export function MemoryTimeline({ memories }: { memories: MemorySummary[] }) {
  const urls = useSignedUrls(memories.flatMap((m) => m.photo_paths));

  return (
    <View style={{ gap: 8 }}>
      <ErrorText error={urls.error} />
      {sections(memories).map((section, si) => (
        <View key={section.year} style={{ gap: 12 }}>
          <View style={styles.yearRow}>
            <T style={[styles.year, si > 0 && { color: colors.line }]}>{section.year}</T>
            <View style={styles.rule} />
          </View>
          <View style={styles.thread}>
            <View style={styles.line} />
            {section.months.map((month) => (
              <View key={month.month} style={{ gap: 10 }}>
                <T style={styles.month}>{monthName(month.month).toUpperCase()}</T>
                {month.items.map((m) => (
                  <TimelineItem key={m.id} memory={m} urls={urls.data} />
                ))}
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function TimelineItem({ memory, urls }: { memory: MemorySummary; urls: Record<string, string> | undefined }) {
  const color = colorFor(memory.id);
  const when = formatDateRange(memory.happened_on, memory.ends_on);
  const extra = memory.photo_count - memory.photo_paths.length;

  return (
    <View>
      <View style={[styles.dot, { backgroundColor: memory.kind === 'trip' ? colors.accent : color }]} />
      <Link href={{ pathname: '/memory/[id]', params: { id: memory.id } }} asChild>
        <Pressable style={styles.card}>
          {memory.photo_paths.length ? (
            <View style={styles.strip}>
              {memory.photo_paths.slice(0, extra > 0 ? 2 : 3).map((path) =>
                urls?.[path] ? (
                  <Image key={path} source={{ uri: urls[path] }} style={styles.photo} contentFit="cover" transition={150} />
                ) : (
                  <View key={path} style={[styles.photo, { backgroundColor: tint(color, 0.6) }]} />
                ),
              )}
              {extra > 0 ? (
                <View style={[styles.photo, styles.more]}>
                  <T style={{ fontFamily: fonts.semibold, color: colors.inkSoft }}>+{extra + 1}</T>
                </View>
              ) : null}
            </View>
          ) : null}
          <View style={{ gap: 6 }}>
            <T variant="heading" style={{ fontSize: 18 }} numberOfLines={1}>
              {memory.title}
            </T>
            <View style={styles.chips}>
              {memory.kind === 'trip' ? <Chip icon="navigation" label={t('memory.kind.trip')} tone="accent" /> : null}
              {when ? <Chip icon="calendar" label={when} /> : null}
              {memory.place ? <Chip icon="map-pin" label={memory.place} /> : null}
            </View>
          </View>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  year: { fontFamily: fonts.displayHeavy, fontSize: 44, lineHeight: 48, letterSpacing: -1.5, color: colors.accent },
  rule: { flex: 1, height: 1, backgroundColor: colors.line },
  thread: { paddingLeft: 28, gap: 18 },
  line: { position: 'absolute', left: 8, top: 6, bottom: 0, width: 2, backgroundColor: colors.line },
  month: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.6, color: colors.inkSoft },
  dot: {
    position: 'absolute',
    left: -26,
    top: 16,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: colors.cream,
  },
  card: {
    padding: 12,
    gap: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
  strip: { flexDirection: 'row', gap: 6 },
  photo: { flex: 1, height: 88, borderRadius: radius.sm },
  more: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
