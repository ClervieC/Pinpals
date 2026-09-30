import { type Href, Link } from 'expo-router';
import { Children, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { colors, fonts, radius, shade, tint } from '@/lib/theme';

import { Icon, type IconName, T } from './ui';

export const PAGE_MAX_WIDTH = 760;

/** Grille responsive : deux colonnes dès qu'il y a la place (tablette, web), une sur téléphone. */
export function Grid({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const columns = Math.min(width - 40, PAGE_MAX_WIDTH) >= 600 ? 2 : 1;
  return (
    <View style={styles.grid}>
      {Children.toArray(children).map((child, i) => (
        <View key={i} style={[styles.cell, { width: `${100 / columns}%` }]}>
          {child}
        </View>
      ))}
    </View>
  );
}

type ColorCardProps = {
  /** Sans lien : aperçu non cliquable (ex. formulaire de groupe). */
  href?: Href;
  color: string;
  /** Pastille qui chevauche le bandeau : emoji de groupe, avatar… */
  badge: ReactNode;
  title: string;
  subtitle?: string | null;
  /** Pastille optionnelle en haut à gauche du bandeau (ex. « Dans 3 jours »). */
  tag?: ReactNode;
};

/** Carte signature de l'app : bandeau coloré, pastille qui déborde, titre, flèche. */
export function ColorCard({ href, color, badge, title, subtitle, tag }: ColorCardProps) {
  const content = (
    <>
      <View style={[styles.band, { backgroundColor: tint(color, 0.55) }]}>
        <View style={[styles.deco, { top: 14, right: 22 }]}>
          <Icon name="map-pin" size={16} color={shade(color, 0.15)} />
        </View>
        <View style={[styles.deco, { top: 38, right: 64 }]}>
          <Icon name="map-pin" size={12} color={shade(color, 0.05)} />
        </View>
        {tag ? <View style={styles.tag}>{tag}</View> : null}
        <View style={styles.badge}>{badge}</View>
      </View>
      <View style={styles.body}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="heading" style={{ fontSize: 20 }} numberOfLines={1}>
            {title}
          </T>
          {subtitle ? (
            <T variant="caption" numberOfLines={1}>
              {subtitle}
            </T>
          ) : null}
        </View>
        <View style={[styles.arrow, { backgroundColor: tint(color, 0.75) }]}>
          <Icon name="arrow-up-right" size={18} color={shade(color, 0.45)} />
        </View>
      </View>
    </>
  );

  if (!href) return <View style={styles.card}>{content}</View>;
  return (
    // Style statique : sur le web, Link asChild ne transmet pas un style en fonction.
    <Link href={href} asChild>
      <Pressable style={styles.card}>{content}</Pressable>
    </Link>
  );
}

/** En-tête des pages de détail : grand bandeau (couleur ou photo), pastille qui déborde, titre. */
export function Hero({
  color,
  badge,
  title,
  eyebrow,
  children,
  cover,
}: {
  color: string;
  badge: ReactNode;
  title: string;
  eyebrow?: string | null;
  /** Pastilles d'info, texte… sous le titre. */
  children?: ReactNode;
  /** Image de couverture à la place du bandeau uni (ex. première photo d'un souvenir). */
  cover?: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={[styles.heroBand, { backgroundColor: tint(color, 0.55) }]}>
        {cover ?? (
          <>
            <View style={[styles.deco, { top: 18, right: 28 }]}>
              <Icon name="map-pin" size={22} color={shade(color, 0.15)} />
            </View>
            <View style={[styles.deco, { top: 56, right: 84 }]}>
              <Icon name="map-pin" size={15} color={shade(color, 0.05)} />
            </View>
            <View style={[styles.deco, { top: 26, right: 140 }]}>
              <Icon name="map-pin" size={11} color={shade(color, 0.1)} />
            </View>
          </>
        )}
        <View style={[styles.badge, styles.heroBadge]}>{badge}</View>
      </View>
      <View style={styles.heroBody}>
        {eyebrow ? <T variant="label">{eyebrow}</T> : null}
        <T variant="title">{title}</T>
        {children}
      </View>
    </View>
  );
}

/** Tuile d'ajout en pointillés corail, à glisser en fin de grille. */
export function AddTile({
  label,
  body,
  icon = 'plus',
  onPress,
  compact = false,
}: {
  label: string;
  body?: string;
  icon?: IconName;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.add, compact ? { minHeight: 96 } : { minHeight: 190 }]}>
      <View style={styles.addIcon}>
        <Icon name={icon} size={22} color={colors.onAccent} />
      </View>
      <T variant="heading">{label}</T>
      {body ? (
        <T variant="caption" style={{ textAlign: 'center', maxWidth: 240 }}>
          {body}
        </T>
      ) : null}
    </Pressable>
  );
}

/** Petite pastille texte (ville, compteur, échéance). */
export function Chip({ icon, label, tone = 'default' }: { icon?: IconName; label: string; tone?: 'default' | 'accent' }) {
  const accent = tone === 'accent';
  return (
    <View style={[styles.chip, accent && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
      {icon ? <Icon name={icon} size={13} color={accent ? colors.onAccent : colors.inkSoft} /> : null}
      <T style={[styles.chipText, accent && { color: colors.onAccent }]} numberOfLines={1}>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -7 },
  cell: { padding: 7 },
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
  band: { height: 92, justifyContent: 'flex-end', paddingHorizontal: 16 },
  deco: { position: 'absolute' },
  tag: { position: 'absolute', top: 12, left: 12 },
  badge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
    marginBottom: -24,
    borderWidth: 3,
    borderColor: colors.paper,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  body: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, padding: 16, paddingTop: 34 },
  heroBand: { height: 132, justifyContent: 'flex-end', paddingHorizontal: 20, overflow: 'visible' },
  heroBadge: { width: 84, height: 84, borderRadius: 28, marginBottom: -34 },
  heroBody: { padding: 20, paddingTop: 44, gap: 8 },
  arrow: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  add: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: tint(colors.accent, 0.45),
    backgroundColor: tint(colors.accent, 0.94),
  },
  addIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    marginBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft },
});
