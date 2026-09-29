// maplibre-gl 6 charge son worker depuis un fichier .mjs séparé, situé à côté de son propre
// script. Avec Metro tout est dans un seul bundle : on copie donc le worker (et le chunk
// partagé qu'il importe) dans public/, servi tel quel par Expo en dev et à l'export web.
// Lancé automatiquement par `npm install` (postinstall).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const from = path.join(root, 'node_modules', 'maplibre-gl', 'dist');
const to = path.join(root, 'public', 'maplibre');

fs.mkdirSync(to, { recursive: true });
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  fs.copyFileSync(path.join(from, file), path.join(to, file));
}
console.log('maplibre-gl worker copié dans public/maplibre');
