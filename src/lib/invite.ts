import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

import { t } from './i18n';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/$/, '');
const PENDING_KEY = 'pinpals.pendingInvite';

/**
 * Lien à partager (WhatsApp, etc.) : l'URL web https est cliquable partout et ouvre
 * l'app via les universal/app links ; sinon on retombe sur pinpals://join/CODE.
 */
export function inviteUrl(code: string): string {
  return WEB_URL ? `${WEB_URL}/join/${code}` : Linking.createURL(`/join/${code}`);
}

export function inviteMessage(groupName: string, emoji: string, code: string): string {
  return t('invite.message', { emoji, name: groupName, url: inviteUrl(code) });
}

// Un invité qui n'a pas encore de compte : on garde le code le temps de l'inscription.
export const pendingInvite = {
  set: (code: string) => AsyncStorage.setItem(PENDING_KEY, code),
  get: () => AsyncStorage.getItem(PENDING_KEY),
  clear: () => AsyncStorage.removeItem(PENDING_KEY),
};
