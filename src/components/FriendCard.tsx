import { StyleSheet, View } from 'react-native';

import { formatDayMonth, t } from '@/lib/i18n';
import { colors, fonts, themed } from '@/lib/theme';
import type { FavoriteKey, Favorites, Profile } from '@/lib/types';

import { Field, T } from './ui';

type FavoriteMeta = {
  emoji: string;
  label: () => string;
  placeholder: () => string;
  /** Préfixes qu'on tape par réflexe (« food: pizza ») et qu'on retire à l'enregistrement. */
  aliases: string[];
};

export const FAVORITES: Record<FavoriteKey, FavoriteMeta> = {
  food: { emoji: '🍕', label: () => t('fav.food'), placeholder: () => t('fav.foodPlaceholder'), aliases: ['food', 'plat', 'plats', 'nourriture', 'cuisine', 'repas'] },
  drink: { emoji: '🥤', label: () => t('fav.drink'), placeholder: () => t('fav.drinkPlaceholder'), aliases: ['drink', 'drinks', 'boisson', 'boissons'] },
  music: { emoji: '🎵', label: () => t('fav.music'), placeholder: () => t('fav.musicPlaceholder'), aliases: ['music', 'musique', 'song', 'chanson'] },
  movies: { emoji: '🎬', label: () => t('fav.movies'), placeholder: () => t('fav.moviesPlaceholder'), aliases: ['movies', 'movie', 'films', 'film', 'séries', 'series', 'shows'] },
  books: { emoji: '📚', label: () => t('fav.books'), placeholder: () => t('fav.booksPlaceholder'), aliases: ['books', 'book', 'livres', 'livre'] },
  hobbies: { emoji: '🎨', label: () => t('fav.hobbies'), placeholder: () => t('fav.hobbiesPlaceholder'), aliases: ['hobbies', 'hobby', 'passions', 'passion', 'loisirs'] },
  places: { emoji: '📍', label: () => t('fav.places'), placeholder: () => t('fav.placesPlaceholder'), aliases: ['places', 'place', 'endroits', 'endroit', 'lieux', 'lieu'] },
};

const FAVORITE_KEYS = Object.keys(FAVORITES) as FavoriteKey[];

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** « Food: pizza » -> « pizza » : retire un libellé tapé par réflexe devant la réponse. */
export function cleanFavorite(key: FavoriteKey, value: string): string {
  const names = [...FAVORITES[key].aliases, FAVORITES[key].label().toLowerCase()].map(escapeRegExp).join('|');
  return value.replace(new RegExp(`^\\s*(?:${names})\\s*[:：=-]\\s*`, 'i'), '').trim();
}

export function FavoritesFields({ value, onChange }: { value: Favorites; onChange: (value: Favorites) => void }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ gap: 2 }}>
        <T variant="label">{t('profile.favorites')}</T>
        <T variant="caption">{t('profile.favoritesHint')}</T>
      </View>
      {FAVORITE_KEYS.map((key) => (
        <View key={key} style={styles.fieldRow}>
          <View style={styles.fieldLabel}>
            <T style={{ fontSize: 18 }}>{FAVORITES[key].emoji}</T>
            <T style={styles.fieldLabelText} numberOfLines={1}>
              {FAVORITES[key].label()}
            </T>
          </View>
          <View style={{ flex: 1 }}>
            <Field
              value={value[key] ?? ''}
              onChangeText={(v) => onChange({ ...value, [key]: v })}
              placeholder={FAVORITES[key].placeholder()}
              accessibilityLabel={FAVORITES[key].label()}
              maxLength={120}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

type CardProfile = Pick<Profile, 'birthday_day' | 'birthday_month' | 'birth_year' | 'favorites' | 'wishlist'>;

/** La fiche remplie par la personne elle-même : anniversaire, choses préférées, envies. */
export function FriendCard({ profile }: { profile: CardProfile }) {
  const favorites = FAVORITE_KEYS.filter((k) => profile.favorites?.[k]?.trim());
  const hasBirthday = profile.birthday_day != null && profile.birthday_month != null;

  if (!hasBirthday && favorites.length === 0 && !profile.wishlist) {
    return <T variant="caption">{t('card.empty')}</T>;
  }

  const rows: { label: string; value: string }[] = [
    ...(hasBirthday
      ? [
          {
            label: t('card.birthday'),
            value: `${formatDayMonth(profile.birthday_day!, profile.birthday_month!)}${profile.birth_year ? ` ${profile.birth_year}` : ''}`,
          },
        ]
      : []),
    // Nettoyé aussi à l'affichage : les fiches déjà enregistrées avec « food: pizza » s'affichent proprement.
    ...favorites.map((k) => ({ label: `${FAVORITES[k].emoji} ${FAVORITES[k].label()}`, value: cleanFavorite(k, profile.favorites[k]!) })),
    ...(profile.wishlist ? [{ label: t('card.wishlist'), value: profile.wishlist }] : []),
  ];

  return (
    <View style={styles.card}>
      {rows.map((row, i) => (
        <View key={row.label} style={[styles.row, i > 0 && styles.divider]}>
          <T variant="label" style={styles.label}>
            {row.label}
          </T>
          <T style={{ flex: 1 }}>{row.value}</T>
        </View>
      ))}
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    // Affichée dans une SectionCard : pas de bordure propre.
    card: {},
    row: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
    divider: { borderTopWidth: 1, borderTopColor: colors.line },
    label: { width: 130, paddingTop: 2 },
    fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    fieldLabel: { width: 118, flexDirection: 'row', alignItems: 'center', gap: 6 },
    fieldLabelText: { fontFamily: fonts.medium, fontSize: 14, flexShrink: 1 },
  }),
);
