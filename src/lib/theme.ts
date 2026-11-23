import { Platform } from 'react-native';

export type Scheme = 'light' | 'dark';

const light = {
  cream: '#FBF7F2', // fond des écrans, blanc chaud
  paper: '#FFFFFF', // cartes, champs
  muted: '#F4EEE6', // remplissages discrets (segments, pastilles)
  ink: '#1C1714',
  inkSoft: '#7A716A',
  line: '#ECE4DA',
  accent: '#FF5A3C', // corail : boutons principaux, éléments actifs
  onAccent: '#FFFFFF',
  danger: '#E0352B',
};

// Bleu nuit plutôt que brun : le corail et les couleurs de groupe ressortent au lieu de se salir.
const dark: typeof light = {
  cream: '#0F1218', // fond des écrans
  paper: '#1A1E27', // cartes, champs : un cran plus clair que le fond
  muted: '#252A35',
  ink: '#F1F0EC',
  inkSoft: '#9AA0AD',
  line: '#2B303C',
  accent: '#FF6B4E', // corail un peu plus clair : meilleur contraste sur fond sombre
  onAccent: '#FFFFFF',
  danger: '#FF6159',
};

// shade() mélange vers le « contraste » : en sombre, le texte coloré s'éclaircit au lieu de foncer.
const shadeTargets: Record<Scheme, number[]> = { light: [0, 0, 0], dark: [255, 255, 255] };

/** Luminosité vers laquelle tint() assombrit en mode sombre (≈ celle des cartes). */
const DARK_SURFACE_L = 0.15;

/**
 * Couleurs du thème actif. L'objet est modifié en place par applyScheme() : à lire au rendu
 * (ou dans une feuille de style `themed`), jamais à recopier dans une constante de module.
 */
export const colors = { ...light };

let scheme: Scheme = 'light';
let version = 0;

export function currentScheme(): Scheme {
  return scheme;
}

export function applyScheme(next: Scheme) {
  if (next === scheme) return;
  scheme = next;
  Object.assign(colors, next === 'dark' ? dark : light);
  version++;
}

/**
 * Feuille de style recalculée quand le thème change : `const styles = themed(() => StyleSheet.create({…}))`.
 * Les StyleSheet de module sont sinon figés avec les couleurs du premier chargement.
 */
export function themed<T extends object>(factory: () => T): T {
  let cache: T | null = null;
  let cachedVersion = -1;
  const current = () => {
    if (!cache || cachedVersion !== version) {
      cache = factory();
      cachedVersion = version;
    }
    return cache;
  };
  return new Proxy({} as T, {
    get: (_, key) => Reflect.get(current(), key),
    has: (_, key) => Reflect.has(current(), key),
    ownKeys: () => Reflect.ownKeys(current()),
    getOwnPropertyDescriptor: (_, key) => {
      const d = Reflect.getOwnPropertyDescriptor(current(), key);
      return d ? { ...d, configurable: true } : undefined;
    },
  });
}

/** Couleurs proposées pour les pins et les groupes : vives mais pas criardes (identiques dans les deux thèmes). */
export const pastels = [
  '#FF7A5C', // corail
  '#FFB23F', // mangue
  '#F7D046', // soleil
  '#34C98B', // menthe
  '#2EB8E6', // lagon
  '#5B7CFA', // bleuet
  '#9B6BFF', // violette
  '#FF6FAE', // framboise
];

export const groupEmojis = ['🎓', '🏫', '🧸', '🏡', '⚽️', '🎸', '💼', '✈️', '🌻', '🍕', '🎮', '💖'];

/**
 * Police qui ne contient que les drapeaux (déclarée sur le web par webStyles.web.ts quand le
 * navigateur ne sait pas les dessiner, c'est-à-dire sous Windows).
 */
export const FLAG_FONT = 'Twemoji Country Flags';

// Sur le web, la police des drapeaux passe en premier : elle ne couvre que les drapeaux, tout
// le reste du texte retombe sur Inter / Bricolage. Si elle n'est pas déclarée, elle est ignorée.
const family = (name: string) => (Platform.OS === 'web' ? `"${FLAG_FONT}", ${name}` : name);

export const fonts = {
  /** Titres : grotesque à caractère, pour le côté fun. */
  display: family('BricolageGrotesque_700Bold'),
  displayHeavy: family('BricolageGrotesque_800ExtraBold'),
  regular: family('Inter_400Regular'),
  medium: family('Inter_500Medium'),
  semibold: family('Inter_600SemiBold'),
  bold: family('Inter_700Bold'),
  black: family('Inter_700Bold'),
};

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

function rgb(hex: string): number[] {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: number[]): string {
  return `#${((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1)}`;
}

function mix(hex: string, target: number[], amount: number): string {
  return toHex(rgb(hex).map((c, i) => c + (target[i] - c) * amount));
}

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = rgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return toHex([r, g, b].map((v) => (v + m) * 255));
}

/**
 * Version « surface » d'une couleur, pour les fonds teintés ; amount = 0..1.
 * En clair : mélange vers le blanc (pastel). En sombre : on garde la teinte et une bonne partie
 * de la saturation et on baisse la luminosité, ce qui donne une couleur profonde (corail → rouge
 * brique, menthe → vert sapin) au lieu d'un mélange terne avec le fond.
 */
export function tint(hex: string, amount: number): string {
  if (scheme === 'light') return mix(hex, [255, 255, 255], amount);
  const [h, s, l] = toHsl(hex);
  return fromHsl(h, s * (1 - 0.4 * amount), l + (DARK_SURFACE_L - l) * amount);
}

/** Renforce vers le contraste (noir en clair, blanc en sombre) ; amount = 0..1. Pour du texte lisible sur fond teinté. */
export function shade(hex: string, amount: number): string {
  return mix(hex, shadeTargets[scheme], amount);
}
