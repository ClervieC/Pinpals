// Windows n'a pas d'emojis drapeaux : la police « Twemoji Country Flags » (country-flag-emoji-polyfill)
// les fournit sur le web. On la sert depuis notre propre site plutôt que depuis le CDN du paquet,
// pour ne pas ajouter de service tiers. Lancé automatiquement par `npm install` (postinstall).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const from = path.join(root, 'node_modules', 'country-flag-emoji-polyfill', 'dist', 'TwemojiCountryFlags.woff2');
const to = path.join(root, 'public', 'fonts');

fs.mkdirSync(to, { recursive: true });
fs.copyFileSync(from, path.join(to, 'TwemojiCountryFlags.woff2'));
console.log('police des drapeaux copiée dans public/fonts');
