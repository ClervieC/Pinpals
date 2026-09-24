export const colors = {
  cream: '#FFF6EC',
  paper: '#FFFFFF',
  ink: '#3D3346',
  inkSoft: '#7A6F85',
  line: '#EFE3D6',
  pink: '#FFB5C2',
  danger: '#E5677D',
};

/** Couleurs proposées pour l'anneau des pins et les groupes. */
export const pastels = [
  '#FFB5C2', // rose
  '#FFD6A5', // pêche
  '#FDFFB6', // citron
  '#CAFFBF', // menthe
  '#9BF6FF', // lagon
  '#B5D8FF', // ciel
  '#BDB2FF', // lavande
  '#FFC6FF', // lilas
];

export const groupEmojis = ['🎓', '🏫', '🧸', '🏡', '⚽️', '🎸', '💼', '✈️', '🌻', '🍕', '🎮', '💖'];

export const fonts = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  black: 'Nunito_800ExtraBold',
};

export const radius = { sm: 12, md: 18, lg: 24, pill: 999 };

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
