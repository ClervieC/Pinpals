# Pinpals 📍

Chaque utilisateur pose un pin sur sa ville et rejoint des groupes (promo, amis d'enfance…). Chaque groupe a sa carte pastel avec l'avatar de chaque membre ; un tap ouvre sa card.

**Confidentialité :** on stocke une ville, jamais une position GPS. Les coordonnées sont celles du centre-ville, décalées d'environ 1 km par le serveur (`set_my_location`). Le client ne peut pas écrire `lat`/`lng` directement.

## Stack

Expo SDK 57 + expo-router · Supabase self-hosted · MapLibre (`@maplibre/maplibre-react-native` v11 sur mobile, `maplibre-gl` sur le web) · Photon pour la recherche de ville · `@gorhom/bottom-sheet` · Reanimated 4 · supercluster · TanStack Query · police Nunito.

## Démarrer

```bash
npm install
cp .env.example .env.local   # URL + anon key Supabase, clé MapTiler
```

MapLibre ne tourne pas dans Expo Go : il faut un dev build.

```bash
npx expo run:android          # ou run:ios (macOS)
# ou dans le cloud :
npx eas-cli@latest build --profile development --platform android
npm start                      # démarre Metro pour le dev build
npm run web                    # version web
```

Sans `EXPO_PUBLIC_MAPTILER_KEY`, la carte utilise les tuiles démo de MapLibre (frontières des pays seulement). Avec une clé, elle part du style MapTiler « Pastel », repeint dans [pastelStyle.ts](src/components/map/pastelStyle.ts).

## Supabase (self-hosted)

1. **Migrations.** Applique [supabase/migrations](supabase/migrations) avec `supabase db push --db-url …` ou `psql`. Pour un restore, passe par `supabase_admin`.
2. **Tester les règles RLS.** `npm run test:db` rejoue les migrations dans un Postgres embarqué (PGlite) et vérifie ~40 scénarios : visibilité entre membres, join par code, rôles admin, dossier des avatars…
3. **Auth → URL Configuration.** Ajoute les redirect URLs :
   - `pinpals://auth/callback`
   - `https://pinpals.app/auth/callback` (web)
   - `http://localhost:8081/auth/callback` (dev web)

   Sur le self-hosted, c'est `ADDITIONAL_REDIRECT_URLS` dans le `.env` de Docker.
4. **Template email « Magic Link ».** Ajoute `{{ .Token }}` au template pour que l'utilisateur puisse aussi taper le code à 6 chiffres. C'est pratique quand le lien s'ouvre dans un autre navigateur que celui de l'app.

## Liens d'invitation

- Dans l'app : `pinpals://join/AB12CD34`.
- À partager (WhatsApp…) : `https://pinpals.app/join/AB12CD34` (`EXPO_PUBLIC_WEB_URL`).

Pour que le lien https ouvre l'app plutôt que le site, il reste à faire :

- héberger le build web (`npx expo export -p web`) avec une réécriture de toutes les routes vers `index.html`, pour que `/join/CODE` fonctionne dans un navigateur ;
- servir `/.well-known/apple-app-site-association` (iOS) et `/.well-known/assetlinks.json` (Android) sur `pinpals.app`. Les `associatedDomains` et `intentFilters` sont déjà dans [app.json](app.json).

L'écran [join/[code]](src/app/join/[code].tsx) marche même sans compte. Il affiche un aperçu du groupe, garde le code pendant l'inscription, puis rejoint le groupe une fois l'onboarding terminé.

## Structure

```
src/app/
  _layout.tsx               gardes : non connecté → (auth), sans ville → (onboarding), sinon (app)
  (auth)/sign-in.tsx        lien magique + code OTP
  (onboarding)/profile.tsx  nom, avatar, couleur du pin
  (onboarding)/location.tsx ville (Photon)
  (app)/index.tsx           mes groupes
  (app)/group/[id]/index.tsx     LA carte + bottom sheet
  (app)/group/[id]/settings.tsx  code d'invitation, membres, quitter
  (app)/group/new.tsx
  (app)/me.tsx              profil complet, déménagement, déconnexion
  join/[code].tsx           invitation (accessible sans compte)
  auth/callback.tsx         retour du lien magique (PKCE)
src/components/map/         GroupMap.native / GroupMap.web, pins, clusters, style pastel
src/lib/                    client Supabase, requêtes TanStack, géocodage, thème
supabase/migrations/        schéma, RLS, RPC, bucket avatars
```
