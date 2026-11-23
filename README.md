# Pinpals 📍

Chaque utilisateur pose un pin sur sa ville et rejoint des groupes (promo, amis d'enfance…). Chaque groupe a sa carte pastel avec l'avatar de chaque membre ; un tap ouvre sa card.

**Confidentialité :** on stocke une ville, jamais une position GPS. Les coordonnées sont celles du centre-ville, décalées d'environ 1 km par le serveur (`set_my_location`). Le client ne peut pas écrire `lat`/`lng` directement.

## Stack

Expo SDK 57 + expo-router · Supabase Cloud · web sur Vercel · MapLibre (`@maplibre/maplibre-react-native` v11 sur mobile, `maplibre-gl` sur le web) · Photon pour la recherche de ville · `@gorhom/bottom-sheet` · Reanimated 4 · supercluster · TanStack Query · police Nunito.

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

## Supabase (Cloud)

1. **Migrations.** Applique [supabase/migrations](supabase/migrations) dans l'ordre : `supabase db push` (projet lié avec `supabase link`), ou colle chaque fichier dans le SQL Editor du dashboard.
2. **Tester les règles RLS.** `npm run test:db` rejoue les migrations dans un Postgres embarqué (PGlite) et vérifie les scénarios : visibilité entre membres, join par code, invitations entre amis, rôles admin, dossier des avatars, suppression de compte…
3. **Auth → URL Configuration.**
   - *Site URL* : `https://pinpals-clervie.vercel.app`
   - *Redirect URLs* (avec `**` : le lien de confirmation peut porter `?invite=CODE`) :
     - `pinpals://**`
     - `https://pinpals-clervie.vercel.app/**`
     - `http://localhost:8081/**` (dev web)
4. **Connexion email + mot de passe.** Dans Authentication → Sign In / Providers → Email, vérifie que la longueur minimale du mot de passe est à 6 (comme l'app, valeur par défaut de Supabase). Si « Confirm email » est activé, l'inscription envoie un lien de confirmation qui revient sur `/auth/callback` : les redirect URLs ci-dessus doivent donc être en place. En dev, tu peux désactiver « Confirm email » pour être connecté dès l'inscription. Le lien « mot de passe oublié » revient sur `/auth/reset-password`.

## Inviter des amis

Deux façons d'entrer dans un groupe :

- **Le lien d'invitation**, pour quelqu'un qui n'est pas encore sur Pinpals : `https://pinpals-clervie.vercel.app/join/AB12CD34` (`EXPO_PUBLIC_WEB_URL`), ou `pinpals://join/AB12CD34` dans l'app.
- **Inviter un·e ami·e existant·e** (réglages du groupe) : uniquement quelqu'un avec qui on partage déjà un groupe, pas de recherche. La personne voit l'invitation sur son accueil et choisit de rejoindre ou de refuser (table `group_invitations`, RPC `invite_to_group` / `respond_to_invitation`).

L'écran [join/[code]](src/app/join/[code].tsx) s'ouvre même sans être connecté : il affiche un aperçu du groupe, mais il faut un compte pour rejoindre. Sans session, le code est gardé sur l'appareil et voyage dans le lien de confirmation d'email ; l'utilisateur crée son compte (ou se connecte), finit son profil, puis revient sur l'invitation.

Le site web (Vercel, [vercel.json](vercel.json) renvoie toutes les routes vers `index.html`) ouvre déjà `/join/CODE` dans un navigateur. Pour que le lien https ouvre directement l'app installée, il reste à servir `/.well-known/apple-app-site-association` (iOS, avec le Team ID Apple) et `/.well-known/assetlinks.json` (Android, avec l'empreinte SHA-256 de la clé de signature) dans `public/`. Les `associatedDomains` et `intentFilters` d'[app.json](app.json) pointent déjà sur `pinpals-clervie.vercel.app`.

## Crédits

- Drapeaux sous Windows (web) : police « Twemoji Country Flags » de [country-flag-emoji-polyfill](https://github.com/talkjs/country-flag-emoji-polyfill) (MIT), dessins [Twemoji](https://github.com/jdecked/twemoji) © Twitter, Inc. et contributeurs, sous licence [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/). La police est servie depuis `public/fonts`, copiée au `npm install`.

## Structure

```
src/app/
  _layout.tsx               gardes : non connecté → (auth), sans ville → (onboarding), sinon (app)
  (auth)/sign-in.tsx        connexion / inscription email + mot de passe, mot de passe oublié
  (onboarding)/profile.tsx  nom, avatar, couleur du pin
  (onboarding)/location.tsx ville (Photon)
  (app)/(tabs)/index.tsx    mes groupes, invitations reçues
  (app)/group/[id]/index.tsx     LA carte + bottom sheet
  (app)/group/[id]/settings.tsx  inviter des amis, lien d'invitation, membres, quitter
  (app)/group/new.tsx
  (app)/notifications.tsx   rappels d'anniversaire, invitations, notifications (dans l'app, pas de push)
  (app)/me.tsx              profil complet, déménagement, déconnexion
  join/[code].tsx           invitation (accessible sans compte)
  auth/callback.tsx         retour du lien de confirmation d'email (PKCE)
  auth/reset-password.tsx   nouveau mot de passe (PKCE)
  legal/privacy.tsx, terms.tsx  confidentialité, conditions d'utilisation
src/components/map/         GroupMap.native / GroupMap.web, pins, clusters, style pastel
src/lib/                    client Supabase, requêtes TanStack, géocodage, thème
supabase/migrations/        schéma, RLS, RPC, bucket avatars
```
