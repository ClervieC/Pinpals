export const colors = {
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

/** Couleurs proposées pour les pins et les groupes : vives mais pas criardes. */
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

/** Mélange une couleur hex avec du blanc (amount = part de blanc, 0..1). */
export function tint(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Assombrit une couleur hex (amount = 0..1), pour du texte lisible sur fond pastel. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c * (1 - amount));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
