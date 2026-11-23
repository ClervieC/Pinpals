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

const dark: typeof light = {
  cream: '#151210', // fond : brun très sombre plutôt que noir pur
  paper: '#221E1B',
  muted: '#2C2723',
  ink: '#F3EDE7',
  inkSoft: '#A99F97',
  line: '#3A332E',
  accent: '#FF6B4E', // corail un peu plus clair : meilleur contraste sur fond sombre
  onAccent: '#FFFFFF',
  danger: '#FF645A',
};

// tint() mélange vers la « surface » et shade() vers le « contraste » : en sombre, les pastilles
// teintées se fondent vers le fond sombre et le texte coloré s'éclaircit au lieu de foncer.
const mixTargets: Record<Scheme, { tint: number[]; shade: number[] }> = {
  light: { tint: [255, 255, 255], shade: [0, 0, 0] },
  dark: { tint: [30, 26, 23], shade: [255, 255, 255] },
};

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

export const fonts = {
  /** Titres : grotesque à caractère, pour le côté fun. */
  display: 'BricolageGrotesque_700Bold',
  displayHeavy: 'BricolageGrotesque_800ExtraBold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  black: 'Inter_700Bold',
};

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

function mix(hex: string, target: number[], amount: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const [r, g, b] = channels.map((c, i) => Math.round(c + (target[i] - c) * amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Éclaircit vers la surface (blanc en clair, fond sombre en sombre) ; amount = 0..1. Pour les fonds teintés. */
export function tint(hex: string, amount: number): string {
  return mix(hex, mixTargets[scheme].tint, amount);
}

/** Renforce vers le contraste (noir en clair, blanc en sombre) ; amount = 0..1. Pour du texte lisible sur fond teinté. */
export function shade(hex: string, amount: number): string {
  return mix(hex, mixTargets[scheme].shade, amount);
}
