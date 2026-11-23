import { isAuthError } from '@supabase/supabase-js';

import { t } from './i18n';

/** Aligné sur la longueur minimale configurée côté Supabase (6 par défaut). */
export const MIN_PASSWORD = 6;

// Les messages de Supabase Auth sont en anglais : on traduit les cas courants via leur code.
export function authErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (isAuthError(error)) {
    switch (error.code) {
      case 'invalid_credentials':
        return t('auth.error.invalidCredentials');
      case 'user_already_exists':
      case 'email_exists':
        return t('auth.error.userExists');
      case 'weak_password':
        return t('auth.error.weakPassword', { min: MIN_PASSWORD });
      case 'same_password':
        return t('auth.error.samePassword');
      case 'email_not_confirmed':
        return t('auth.error.emailNotConfirmed');
      case 'over_email_send_rate_limit':
      case 'over_request_rate_limit':
        return t('auth.error.rateLimit');
    }
  }
  return error instanceof Error ? error.message : String(error);
}
