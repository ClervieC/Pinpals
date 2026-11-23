// Styles globaux, chargés uniquement sur le web.
import '../global.css';

import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';

import { FLAG_FONT } from './theme';

// Windows n'a pas d'emojis drapeaux (🇷🇴 s'afficherait « RO ») : si le navigateur ne sait pas
// les dessiner, on déclare une police qui ne contient que les drapeaux, servie par notre site
// (copiée dans public/fonts par scripts/copy-flag-font.mjs). Ailleurs, rien n'est chargé.
polyfillCountryFlagEmojis(FLAG_FONT, '/fonts/TwemojiCountryFlags.woff2');
