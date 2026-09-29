import { StyleSheet, View } from 'react-native';

import { formatDayMonth, t } from '@/lib/i18n';
import { colors, fonts, radius, tint } from '@/lib/theme';
import type { FavoriteKey, Favorites, Profile } from '@/lib/types';

import { Field, T } from './ui';

export const FAVORITES: Record<FavoriteKey, { icon: string; label: () => string; placeholder: () => string }> = {
  food: { icon: '🍕', label: () => t('fav.food'), placeholder: () => t('fav.foodPlaceholder') },
  drink: { icon: '☕', label: () => t('fav.drink'), placeholder: () => t('fav.drinkPlaceholder') },
  music: { icon: '🎵', label: () => t('fav.music'), placeholder: () => t('fav.musicPlaceholder') },
  movies: { icon: '🎬', label: () => t('fav.movies'), placeholder: () => t('fav.moviesPlaceholder') },
  books: { icon: '📚', label: () => t('fav.books'), placeholder: () => t('fav.booksPlaceholder') },
  hobbies: { icon: '🎨', label: () => t('fav.hobbies'), placeholder: () => t('fav.hobbiesPlaceholder') },
  places: { icon: '🌍', label: () => t('fav.places'), placeholder: () => t('fav.placesPlaceholder') },
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
          placeholder={`${FAVORITES[key].icon} ${FAVORITES[key].label()} : ${FAVORITES[key].placeholder()}`}
          maxLength={120}
        />
      ))}
    </View>
  );
}

type CardProfile = Pick<Profile, 'birthday_day' | 'birthday_month' | 'birth_year' | 'favorites' | 'wishlist' | 'pin_color'>;

/** La fiche remplie par la personne elle-même : anniversaire, choses préférées, envies. */
export function FriendCard({ profile }: { profile: CardProfile }) {
  const favorites = FAVORITE_KEYS.filter((k) => profile.favorites?.[k]?.trim());
  const hasBirthday = profile.birthday_day != null && profile.birthday_month != null;

  if (!hasBirthday && favorites.length === 0 && !profile.wishlist) {
    return <T variant="caption">{t('card.empty')}</T>;
  }

  return (
    <View style={[styles.card, { backgroundColor: tint(profile.pin_color, 0.75) }]}>
      {hasBirthday ? (
        <T style={{ fontFamily: fonts.bold }}>
          🎂 {formatDayMonth(profile.birthday_day!, profile.birthday_month!)}
          {profile.birth_year ? ` ${profile.birth_year}` : ''}
        </T>
      ) : null}
      {favorites.map((k) => (
        <View key={k} style={styles.line}>
          <T style={styles.icon}>{FAVORITES[k].icon}</T>
          <T style={{ flex: 1 }}>
            <T style={{ fontFamily: fonts.bold }}>{FAVORITES[k].label()} : </T>
            {profile.favorites[k]}
          </T>
        </View>
      ))}
      {profile.wishlist ? (
        <View style={styles.line}>
          <T style={styles.icon}>🎁</T>
          <T style={{ flex: 1 }}>
            <T style={{ fontFamily: fonts.bold }}>{t('card.wishlist')} : </T>
            {profile.wishlist}
          </T>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 8, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.paper },
  line: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  icon: { width: 24 },
});
