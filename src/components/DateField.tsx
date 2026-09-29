import { View } from 'react-native';

import { lang, t } from '@/lib/i18n';

import { Field, T } from './ui';

/** Date en cours de saisie : trois champs texte, validés par `parseDate`. */
export type DateParts = { day: string; month: string; year: string };

export const emptyDate: DateParts = { day: '', month: '', year: '' };

export function datePartsFromISO(iso: string | null | undefined): DateParts {
  if (!iso) return emptyDate;
  const [year, month, day] = iso.slice(0, 10).split('-');
  return { day: String(Number(day)), month: String(Number(month)), year };
}

/**
 * `null` si vide, `'invalid'` si incomplète ou impossible (31 février…).
 * Avec `yearOptional`, l'année peut rester vide (anniversaire sans révéler son âge).
 */
export function parseDate(
  parts: DateParts,
  { yearOptional = false } = {},
): { day: number; month: number; year: number | null } | null | 'invalid' {
  const { day, month, year } = { day: parts.day.trim(), month: parts.month.trim(), year: parts.year.trim() };
  if (!day && !month && !year) return null;
  const d = Number(day);
  const m = Number(month);
  const y = year ? Number(year) : null;
  if (!Number.isInteger(d) || !Number.isInteger(m) || d < 1 || m < 1 || m > 12) return 'invalid';
  if (y === null && !yearOptional) return 'invalid';
  if (y !== null && (!Number.isInteger(y) || y < 1900 || y > 2100)) return 'invalid';
  // 2000 est bissextile : le 29 février reste valide quand l'année est inconnue.
  const check = new Date(y ?? 2000, m - 1, d);
  if (check.getMonth() !== m - 1) return 'invalid';
  return { day: d, month: m, year: y };
}

export function toISODate(parsed: { day: number; month: number; year: number | null }): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.year}-${pad(parsed.month)}-${pad(parsed.day)}`;
}

type Props = {
  label: string;
  value: DateParts;
  onChange: (value: DateParts) => void;
  yearOptional?: boolean;
};

export function DateField({ label, value, onChange, yearOptional = false }: Props) {
  const invalid = parseDate(value, { yearOptional }) === 'invalid';
  const day = (
    <Field
      key="day"
      value={value.day}
      onChangeText={(v) => onChange({ ...value, day: v.replace(/\D/g, '') })}
      placeholder={t('date.dayPlaceholder')}
      keyboardType="number-pad"
      maxLength={2}
      style={{ width: 64, textAlign: 'center' }}
    />
  );
  const month = (
    <Field
      key="month"
      value={value.month}
      onChangeText={(v) => onChange({ ...value, month: v.replace(/\D/g, '') })}
      placeholder={t('date.monthPlaceholder')}
      keyboardType="number-pad"
      maxLength={2}
      style={{ width: 64, textAlign: 'center' }}
    />
  );

  return (
    <View style={{ gap: 6 }}>
      <T variant="label">{label}</T>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        {lang === 'fr' ? [day, month] : [month, day]}
        <Field
          value={value.year}
          onChangeText={(v) => onChange({ ...value, year: v.replace(/\D/g, '') })}
          placeholder={yearOptional ? t('date.yearOptional') : t('date.yearPlaceholder')}
          keyboardType="number-pad"
          maxLength={4}
          style={{ width: yearOptional ? 130 : 90, textAlign: 'center' }}
        />
      </View>
      {invalid ? <T variant="caption">{t('date.invalid')}</T> : null}
    </View>
  );
}
