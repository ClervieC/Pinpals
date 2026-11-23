import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatDateRange, monthName, t } from '@/lib/i18n';
import { useSignedUrls } from '@/lib/queries';
import { colors, fonts, radius, themed, tint } from '@/lib/theme';
import type { MemorySummary } from '@/lib/types';

import { colorFor } from './Memories';
import { Chip } from './Tiles';
import { MoreSticker, Polaroid } from './Polaroid';
import { cardShadow, ErrorText, T } from './ui';

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
                <View style={styles.monthPill}>
                  <T style={styles.month}>{monthName(month.month).toUpperCase()}</T>
                </View>
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

// Inclinaisons des polaroïds empilés, de celui du fond à celui du dessus.
const FAN = [-9, 6, -2];

function TimelineItem({ memory, urls }: { memory: MemorySummary; urls: Record<string, string> | undefined }) {
  const color = colorFor(memory.id);
  const when = formatDateRange(memory.happened_on, memory.ends_on);
  const shown = memory.photo_paths.slice(0, 3);
  const extra = memory.photo_count - shown.length;
  // Un souvenir sur deux penche dans l'autre sens : moins mécanique.
  const flip = memory.id.charCodeAt(0) % 2 ? -1 : 1;

  return (
    <View>
      <View style={[styles.dot, { backgroundColor: memory.kind === 'trip' ? colors.accent : color }]} />
      <Link href={{ pathname: '/memory/[id]', params: { id: memory.id } }} asChild>
        <Pressable style={styles.card}>
          <View style={styles.stack}>
            {shown.length ? (
              shown.map((path, i) => (
                <Polaroid
                  key={path}
                  uri={urls?.[path]}
                  color={color}
                  width={78}
                  rotate={FAN[i + 3 - shown.length] * flip}
                  tape={i === shown.length - 1}
                  style={{ position: 'absolute', left: 8 + i * 6, top: 6 + i * 2 }}
                />
              ))
            ) : (
              <Polaroid
                color={color}
                width={78}
                rotate={-4 * flip}
                icon={memory.kind === 'trip' ? 'navigation' : 'camera'}
                style={{ position: 'absolute', left: 14, top: 8 }}
              />
            )}
            {extra > 0 ? <MoreSticker count={extra} color={color} style={styles.more} /> : null}
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            <T variant="heading" style={{ fontSize: 18 }} numberOfLines={2}>
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

const styles = themed(() =>
  StyleSheet.create({
    yearRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    year: { fontFamily: fonts.displayHeavy, fontSize: 44, lineHeight: 48, letterSpacing: -1.5, color: colors.accent },
    rule: { flex: 1, height: 1, backgroundColor: colors.line },
    thread: { paddingLeft: 28, gap: 18 },
    line: { position: 'absolute', left: 8, top: 6, bottom: 0, width: 2, backgroundColor: colors.line },
    monthPill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: tint(colors.accent, 0.88),
    },
    month: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.6, color: colors.accent },
    dot: {
      position: 'absolute',
      left: -28,
      top: 44,
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 4,
      borderColor: colors.paper,
      zIndex: 1,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 14,
      borderRadius: 24,
      backgroundColor: colors.paper,
      ...cardShadow,
    },
    // Zone fixe pour la pile de polaroïds (positionnés en absolu).
    stack: { width: 112, height: 118 },
    more: { position: 'absolute', right: 0, bottom: 4 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  }),
);
