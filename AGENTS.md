This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Pinpals — règles du projet

- Confidentialité : on ne stocke qu'une ville. `profiles.lat/lng` ne s'écrivent que via la RPC `set_my_location` (jitter côté serveur) ; ne jamais ajouter de grant UPDATE sur ces colonnes.
- Toute écriture dans `group_members` / création de groupe / invitation passe par une RPC `security definer`. Le projet est sur Supabase Cloud, où les nouvelles fonctions et tables sont ouvertes à `anon` par défaut : chaque nouvelle fonction reçoit `revoke execute ... from public, anon` puis `grant execute ... to authenticated`, et une table en écriture par RPC seulement reçoit `revoke all ... from anon, authenticated` puis les seuls grants utiles.
- Inviter quelqu'un dans un groupe : soit par le lien (`join_group`), soit en invitant un·e ami·e existant·e (quelqu'un avec qui on partage déjà un groupe, `invite_to_group`). Pas de recherche d'utilisateurs, et personne n'est ajouté à un groupe sans accepter (`respond_to_invitation`).
- Après toute modification de `supabase/migrations`, lancer `npm run test:db` (RLS rejouées dans PGlite) et y ajouter les scénarios concernés.
- La carte a deux implémentations : `GroupMap.native.tsx` (MapLibre RN v11) et `GroupMap.web.tsx` (maplibre-gl + portals). Toute évolution des pins doit rester dans `Pins.tsx`, partagé par les deux.
- Textes UI en français et en anglais : jamais de texte en dur, tout passe par `t()` / `tn()` de `src/lib/i18n.ts` (ajouter chaque clé dans `fr` et `en`). Par défaut la langue suit celle de l'appareil (français si l'appareil est en français, anglais sinon) ; l'utilisateur peut la changer dans « Mon profil » → Préférences (`src/lib/prefs.ts`, stocké sur l'appareil). Ne jamais appeler `t()` au niveau du module (constante calculée au chargement) : l'appeler au rendu, ou via une fonction / un getter.
- Les dates s'affichent toujours jour, mois, année (`formatDate`, `formatDateRange`), dans les deux langues.
- Thème clair / sombre (`src/lib/theme.ts`) : `colors` change de valeurs quand le thème change, et un changement de langue ou de thème remonte les écrans (clé du `RootNavigator`). Donc :
  - toute feuille de style s'écrit `const styles = themed(() => StyleSheet.create({ … }))` ;
  - ne jamais recopier `colors.*`, `tint()` ou `shade()` dans une constante de module : les lire au rendu ou dans une feuille `themed` ;
  - `tint()` donne la version « surface » d'une couleur (pastel en clair, version profonde et saturée en sombre, thème bleu nuit) et `shade()` renforce vers le contraste, dans les deux thèmes : les utiliser pour les fonds teintés et le texte coloré plutôt que des couleurs en dur ;
  - une vue qui porte une ombre ne doit pas avoir `overflow: 'hidden'` (iOS coupe l'ombre) : ombre sur une couche extérieure, découpe sur une couche intérieure ;
  - la carte a une palette par thème dans `pastelStyle.ts`.
- Photos des souvenirs : l'app envoie l'original et une miniature (`thumb_path`, ~480 px, `expo-image-manipulator`). Les listes et les murs affichent la miniature (`thumb_path ?? path`), seule la visionneuse charge l'original. Pour supprimer les fichiers d'une photo, utiliser `photoFiles()` (original + miniature).
- Listes de souvenirs et de commentaires : paginées par `PAGE_SIZE` (`useMemoriesPaged`, `useMemoryComments`). Seule la carte charge tous les souvenirs (`useMemories`).
- Notifications : uniquement dans l'app, pas de push. La table `notifications` est remplie par des triggers en base (commentaires, likes, identification, nouveau souvenir de groupe, nouveau membre, déménagement) et lue via `get_my_notifications`, qui masque ce que l'utilisateur ne peut plus voir. Un nouvel événement à notifier = un trigger qui appelle `notify()` (jamais à soi-même) + un `kind` dans la contrainte, `NotificationKind` et les clés `notifications.kind.*`. Les rappels d'anniversaire ne sont pas stockés : l'app les calcule (`src/lib/birthdays.ts`).
- Suppression de compte : `useDeleteAccount` retire d'abord les fichiers du stockage (avatar, photos), puis la RPC `delete_my_account` supprime l'utilisateur ; le reste suit par cascade. Toute nouvelle table liée à un utilisateur doit référencer `profiles(id) on delete cascade`, et tout nouveau fichier stocké doit être ajouté au nettoyage de `useDeleteAccount`.
