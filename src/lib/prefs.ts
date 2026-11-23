import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

import { deviceLang, type Lang, setLang } from './i18n';
import { applyScheme, type Scheme } from './theme';

/** Réglages d'affichage de l'appareil (pas du compte) : langue et thème. */
export type SchemePref = 'system' | Scheme;
export type Prefs = { lang: Lang | null; scheme: SchemePref };

const KEY = 'pinpals.prefs';
const defaults: Prefs = { lang: null, scheme: 'system' };

let prefs: Prefs = defaults;
// Instantané stable pour useSyncExternalStore : remplacé à chaque changement effectif.
let snapshot = resolve();
const listeners = new Set<() => void>();

function resolve() {
  const scheme: Scheme =
    prefs.scheme === 'system' ? (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light') : prefs.scheme;
  return { lang: prefs.lang ?? deviceLang, scheme, prefs };
}

function apply() {
  const next = resolve();
  setLang(next.lang);
  applyScheme(next.scheme);
  if (next.lang !== snapshot.lang || next.scheme !== snapshot.scheme || next.prefs !== snapshot.prefs) {
    snapshot = next;
    listeners.forEach((l) => l());
  }
}

/** À appeler une fois au démarrage, avant le premier rendu des écrans. */
export async function loadPrefs() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) prefs = { ...defaults, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    // Réglages illisibles : on garde les valeurs par défaut.
  }
  apply();
}

export async function updatePrefs(patch: Partial<Prefs>) {
  prefs = { ...prefs, ...patch };
  apply();
  await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
}

// En mode « Auto », on suit le thème du système en direct.
Appearance.addChangeListener(() => {
  if (prefs.scheme === 'system') apply();
});

/** Langue et thème effectifs + réglages bruts ; re-rend quand ils changent. */
export function usePrefs() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
  );
}
