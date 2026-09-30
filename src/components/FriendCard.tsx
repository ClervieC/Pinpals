import { StyleSheet, View } from 'react-native';

import { formatDayMonth, t } from '@/lib/i18n';
import { colors } from '@/lib/theme';
import type { FavoriteKey, Favorites, Profile } from '@/lib/types';

import { Field, T } from './ui';

export const FAVORITES: Record<FavoriteKey, { label: () => string; placeholder: () => string }> = {
  food: { label: () => t('fav.food'), placeholder: () => t('fav.foodPlaceholder') },
  drink: { label: () => t('fav.drink'), placeholder: () => t('fav.drinkPlaceholder') },
  music: { label: () => t('fav.music'), placeholder: () => t('fav.musicPlaceholder') },
  movies: { label: () => t('fav.movies'), placeholder: () => t('fav.moviesPlaceholder') },
  books: { label: () => t('fav.books'), placeholder: () => t('fav.booksPlaceholder') },
  hobbies: { label: () => t('fav.hobbies'), placeholder: () => t('fav.hobbiesPlaceholder') },
  places: { label: () => t('fav.places'), placeholder: () => t('fav.placesPlaceholder') },
};

const FAVORITE_KEYS = Object.keys(FAVORITES) as FavoriteKey[];

export function FavoritesFields({ value, onChange }: { value: Favorites; onChange: (value: Favorites) => void }) {
  return (
    <View style={{ gap: 10 }}>
      <T variant="label">{t('profile.favorites')}</T>
      {FAVORITE_KEYS.map((key) => (
        <Field
          key={key}
          value={value[key] ?? ''}
          onChangeText={(v) => onChange({ ...value, [key]: v })}
          placeholder={`${FAVORITES[key].label()} : ${FAVORITES[key].placeholder()}`}
          maxLength={120}
        />
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
    ...favorites.map((k) => ({ label: FAVORITES[k].label(), value: profile.favorites[k]! })),
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

const styles = StyleSheet.create({
  // Affichée dans une SectionCard : pas de bordure propre.
  card: {},
  row: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  label: { width: 110, paddingTop: 2 },
});
