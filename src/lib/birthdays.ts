import { daysUntilBirthday, t } from './i18n';
import type { Friend } from './types';

/** Nombre de jours avant le prochain anniversaire (0 = aujourd'hui), ou null s'il n'est pas renseigné. */
export function birthdayIn(f: Friend): number | null {
  return f.birthday_day && f.birthday_month ? daysUntilBirthday(f.birthday_day, f.birthday_month) : null;
}

/** Les ami·es dont l'anniversaire tombe dans les `days` prochains jours, le plus proche d'abord. */
export function upcomingBirthdays(friends: Friend[], days: number): Friend[] {
  return friends
    .filter((f) => (birthdayIn(f) ?? Infinity) <= days)
    .sort((a, b) => birthdayIn(a)! - birthdayIn(b)!);
}

/** « C'est aujourd'hui ! », « Demain », « Dans 3 jours ». */
export function countdown(days: number): string {
  return days === 0 ? t('friends.today') : days === 1 ? t('friends.tomorrow') : t('friends.inDays', { count: days });
}
