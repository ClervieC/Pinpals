import { getLocales } from 'expo-localization';

/**
 * Traductions FR / EN. La langue suit celle de l'appareil au lancement :
 * français si l'appareil est en français, anglais sinon.
 */
export type Lang = 'fr' | 'en';

export const lang: Lang = getLocales()[0]?.languageCode === 'fr' ? 'fr' : 'en';

const fr = {
  // Connexion
  'auth.headline': 'Tes potes, sur une carte.',
  'auth.tagline': "Où vit ta promo, tes amis d'enfance, ta team. Leurs anniversaires, vos souvenirs, vos voyages.",
  'auth.signIn.title': 'Connexion',
  'auth.signUp.title': 'Créer un compte',
  'auth.email': 'Email',
  'auth.emailPlaceholder': 'toi@exemple.fr',
  'auth.password': 'Mot de passe',
  'auth.passwordMin': '{min} caractères minimum',
  'auth.signIn.submit': 'Se connecter',
  'auth.signUp.submit': 'Créer mon compte',
  'auth.toSignUp': 'Pas encore de compte ? Inscris-toi',
  'auth.toSignIn': "J'ai déjà un compte",
  'auth.confirm.title': 'Confirme ton email',
  'auth.confirm.body': 'On a envoyé un lien de confirmation à {email}. Clique dessus, puis reviens te connecter.',
  'auth.confirm.done': "J'ai confirmé, me connecter",
  'auth.error.invalidCredentials': 'Email ou mot de passe incorrect.',
  'auth.error.userExists': 'Un compte existe déjà avec cet email. Connecte-toi.',
  'auth.error.weakPassword': 'Mot de passe trop faible ({min} caractères minimum).',
  'auth.error.emailNotConfirmed': "Ton email n'est pas encore confirmé. Clique sur le lien reçu par mail.",
  'auth.error.rateLimit': 'Trop de tentatives. Réessaie dans quelques minutes.',
  'callback.title': 'Oups',
  'callback.invalid': 'Lien invalide ou expiré.',
  'callback.body': 'Le lien a peut-être déjà servi ou expiré. Tu peux quand même essayer de te connecter avec ton mot de passe.',
  'callback.back': 'Revenir à la connexion',

  // Onboarding
  'onboarding.profile.title': 'Enchanté·e',
  'onboarding.profile.body': 'Choisis ta tête et la couleur de ton pin. Tes amis te verront comme ça sur la carte.',
  'onboarding.location.title': 'Tu vis où ?',
  'onboarding.step': 'Étape {step} sur {total}',
  'onboarding.location.search': 'Ta ville',
  'onboarding.location.private': 'Jamais ton adresse',
  'onboarding.location.body':
    'Juste ta ville, jamais ta position exacte. Ton pin sera placé près du centre-ville, légèrement décalé pour ne pas chevaucher les autres.',

  // Commun
  'common.continue': 'Continuer',
  'common.save': 'Enregistrer',
  'common.cancel': 'Annuler',
  'common.back': 'Retour',
  'common.later': 'Plus tard',
  'common.linkCopied': 'Lien copié',
  'common.members_one': '{count} membre',
  'common.members_other': '{count} membres',

  // Profil
  'profile.name': 'Ton prénom (ou surnom)',
  'profile.namePlaceholder': 'Camille',
  'profile.pinColor': 'La couleur de ton pin',
  'profile.emoji': 'Un emoji qui te ressemble (optionnel)',
  'profile.job': 'Métier',
  'profile.jobPlaceholder': 'Designer',
  'profile.company': 'Entreprise',
  'profile.companyPlaceholder': 'Studio Nuage',
  'profile.bio': 'Bio',
  'profile.bioPlaceholder': 'Fan de randonnée et de bons croissants',
  'profile.socials': 'Réseaux',
  'profile.changeAvatar': "Changer d'avatar",
  'social.website': 'Site',
  'social.handle': '@pseudo',
  'social.handleOrUrl': 'pseudo ou URL',
  'social.sitePlaceholder': 'monsite.fr',

  // Mon profil
  'me.title': 'Mon profil',
  'me.city': 'Ma ville',
  'me.since': 'depuis {date}',
  'me.moved': "J'ai déménagé",
  'me.signOut': 'Se déconnecter',

  // Villes
  'city.placeholder': 'Bucarest, Lyon, Montréal…',
  'city.none': 'Aucune ville trouvée',

  // Accueil
  'home.title': 'Mes groupes',
  'home.greeting': 'Salut {name}',
  'home.joinTitle': "Tu as un code d'invitation ?",
  'home.youAreIn': 'Tu es à {city}',
  'home.createGroup': 'Nouveau groupe',
  'home.empty.title': 'Ta carte est encore vide',
  'home.empty.body': "Crée un groupe pour ta promo ou tes amis d'enfance, puis partage le lien d'invitation.",
  'home.empty.cta': 'Créer mon premier groupe',
  'home.codePlaceholder': "Code d'invitation",
  'home.join': 'Rejoindre',

  // Groupe
  'group.new.title': 'Nouveau groupe',
  'group.new.body': 'Un groupe = une carte. Tu pourras inviter tout le monde avec un lien juste après.',
  'group.new.submit': 'Créer le groupe',
  'group.name': 'Nom du groupe',
  'group.preview': 'Aperçu',
  'group.namePlaceholder': 'Promo ENSAD 2020',
  'group.emoji': 'Emoji',
  'group.color': 'Couleur',
  'group.color.a11y': 'Couleur {color}',
  'group.notFound': 'Groupe introuvable',
  'group.onMap': '{count} sur la carte',
  'group.alone.title': 'Invite ta promo',
  'group.alone.body': "Tu es tout·e seul·e sur la carte pour l'instant. Partage le lien et regarde les pins tomber.",
  'group.alone.cta': "Partager le lien d'invitation",

  // Réglages du groupe
  'settings.title': 'Réglages du groupe',
  'settings.inviteCode': "Code d'invitation",
  'settings.tapToCopy': 'Touche pour copier le lien',
  'settings.regenerate': 'Générer un nouveau code',
  'settings.group': 'Le groupe',
  'settings.members': 'Membres ({count})',
  'settings.you': ' (toi)',
  'settings.admin': 'Admin',
  'settings.noPin': 'Pas encore de pin',
  'settings.remove': 'Retirer',
  'settings.removeA11y': 'Retirer du groupe',
  'settings.leave': 'Quitter le groupe',
  'settings.leaveConfirm': 'Sûr·e ? Touche encore pour quitter',

  // Invitations
  'invite.button': 'Inviter des amis',
  'invite.message': '{emoji} Rejoins « {name} » sur Pinpals et pose ton pin sur la carte !\n{url}',
  'join.notFound': "Ce code d'invitation n'existe pas",
  'join.invited': 'Tu es invité·e à rejoindre',
  'join.count_one': '{count} personne a déjà posé son pin',
  'join.count_other': '{count} personnes ont déjà posé leur pin',
  'join.open': 'Voir la carte',
  'join.signUp': 'Créer mon compte et rejoindre',
  'join.finishProfile': 'Finir mon profil et rejoindre',
  'join.join': 'Rejoindre le groupe',

  // Card membre
  'member.livesSince': 'à {city} depuis {date}',

  // Erreurs renvoyées par les RPC Supabase (messages en français côté SQL)
  'server.invalidCoords': 'Coordonnées invalides',
  'server.profileNotFound': 'Profil introuvable',
  'server.invalidCode': 'Code invalide',
  'server.adminOnly': 'Réservé aux admins',
  'server.useLeave': 'Utilise « Quitter le groupe » pour te retirer',
  // Onglets
  'tabs.groups': 'Groupes',
  'tabs.friends': 'Ami·es',
  'tabs.memories': 'Souvenirs',
  'common.saved': 'Enregistré',

  // Dates
  'date.dayPlaceholder': 'JJ',
  'date.monthPlaceholder': 'MM',
  'date.yearPlaceholder': 'AAAA',
  'date.yearOptional': 'AAAA (option)',
  'date.invalid': 'Date incomplète ou impossible.',

  // Fiche
  'profile.birthday': 'Ton anniversaire',
  'profile.section.pin': 'Ton pin',
  'profile.section.card': 'Ta fiche',
  'profile.section.cardHint': 'Visible par les membres de tes groupes. Tout est optionnel.',
  'profile.section.more': 'Boulot, bio et réseaux',
  'profile.favorites': 'Tes choses préférées',
  'profile.wishlist': 'Tes envies (idées cadeaux)',
  'profile.wishlistPlaceholder': 'Un vinyle de Daft Punk, des plantes, un cours de poterie…',
  'fav.food': 'Plat',
  'fav.foodPlaceholder': 'sushis, raclette…',
  'fav.drink': 'Boisson',
  'fav.drinkPlaceholder': 'matcha latte, spritz…',
  'fav.music': 'Musique',
  'fav.musicPlaceholder': 'Angèle, jazz…',
  'fav.movies': 'Films & séries',
  'fav.moviesPlaceholder': 'Ghibli, The Office…',
  'fav.books': 'Livres',
  'fav.booksPlaceholder': 'Harry Potter, romans policiers…',
  'fav.hobbies': 'Passions',
  'fav.hobbiesPlaceholder': 'escalade, crochet…',
  'fav.places': 'Endroits',
  'fav.placesPlaceholder': 'Lisbonne, la mer…',
  'card.empty': "Pas encore de fiche remplie.",
  'card.wishlist': 'Envies',
  'card.birthday': 'Anniversaire',

  // Ami·es
  'friends.title': 'Mes ami·es',
  'friends.count': '{count} personnes dans tes groupes',
  'friends.soon': 'Anniversaires à venir',
  'friends.everyone': 'Tout le monde',
  'friends.birthdayOn': 'anniv. le {date}',
  'friends.empty.title': "Pas encore d'ami·es ici",
  'friends.empty.body': 'Les membres de tes groupes apparaissent ici, avec leurs anniversaires.',
  'friends.today': "C'est aujourd'hui !",
  'friends.tomorrow': 'Demain',
  'friends.inDays': 'Dans {count} jours',
  'friend.notFound': 'Ami·e introuvable',
  'friend.card': 'Sa fiche',
  'friend.address': 'Son adresse',
  'friend.memories': 'Vos souvenirs',
  'friend.addMemory': 'Un souvenir avec {name}',
  'friend.noMemories': 'Aucun souvenir ensemble pour le moment.',
  'friend.private.title': 'Mes notes privées',
  'friend.private.hint': 'Visibles uniquement par toi.',
  'friend.private.gifts': 'Idées cadeaux',
  'friend.private.giftsPlaceholder': 'Ce livre dont elle a parlé, une plante…',
  'friend.private.notes': 'Notes',
  'friend.private.notesPlaceholder': 'Prénom de son chat, allergies, ce qui compte pour lui…',
  'member.openCard': 'Voir sa fiche',
  'map.layer.friends': 'Ami·es',
  'map.layer.memories': 'Souvenirs',
  'map.memoriesEmpty.title': 'Aucun souvenir sur la carte',
  'map.memoriesEmpty.body': 'Choisis la ville (ou les étapes d\'un voyage) de vos souvenirs pour les voir apparaître ici.',
  'city.here': '{count} ami·es ici',
  'city.around': '{count} ami·es par ici',
  'city.seeCard': 'Voir sa fiche',
  'common.close': 'Fermer',
  'memory.open': 'Ouvrir le souvenir',
  'memory.stopsCount': '{count} étapes',

  // Adresse
  'address.title': 'Mon adresse',
  'address.private': 'Privée',
  'address.hint': "Jamais affichée sur la carte. Seul·es les ami·es que tu choisis peuvent la voir, pour t'envoyer une carte ou un cadeau.",
  'address.line1': 'Adresse',
  'address.line2': "Complément (bât., étage…)",
  'address.postalCode': 'Code postal',
  'address.city': 'Ville',
  'address.country': 'Pays',
  'address.sharedWith': 'Qui peut voir mon adresse ?',
  'address.delete': 'Supprimer mon adresse',

  // Souvenirs
  'memories.title': 'Souvenirs',
  'memories.groupTitle': 'Souvenirs du groupe',
  'memories.timelineTitle': 'Notre histoire',
  'memories.add': 'Ajouter un souvenir',
  'memories.addBody': 'Une soirée, un voyage, des photos à partager.',
  'memories.eyebrow': 'Votre scrapbook',
  'memories.filter.all': 'Tout',
  'memories.empty.title': 'Le scrapbook est vide',
  'memories.empty.body': 'Ajoute un souvenir ou un voyage, avec des photos, à partager avec tes ami·es.',
  'memories.empty.group': 'Ajoute le premier souvenir du groupe : une soirée, un voyage, une photo de promo…',
  'memory.kind.memory': 'Souvenir',
  'memory.kind.trip': 'Voyage',
  'memory.title': 'Titre',
  'memory.titlePlaceholder': "L'anniversaire surprise de Léa",
  'memory.titlePlaceholderTrip': 'Road trip au Portugal',
  'memory.date': 'Date',
  'memory.from': 'Du',
  'memory.to': 'Au',
  'memory.badRange': 'La date de fin doit être après la date de début.',
  'memory.body': "Ce qu'il s'est passé",
  'memory.bodyPlaceholder': 'Raconte : les fous rires, les galères, le meilleur moment…',
  'memory.audience': 'Avec qui ?',
  'memory.section.story': 'Le souvenir',
  'memory.where.memory': 'Où ?',
  'memory.where.trip': 'Les étapes',
  'memory.where.memoryHint': 'Juste la ville : le souvenir apparaîtra sur la carte du groupe.',
  'memory.where.tripHint': "Les villes dans l'ordre du trajet : il sera tracé sur la carte du groupe.",
  'memory.where.add': 'Choisir une ville',
  'memory.where.addStop': 'Ajouter une étape',
  'memory.where.change': 'Changer de ville',
  'memory.where.remove': 'Retirer {name}',
  'memory.audienceFriends': 'Des ami·es',
  'memory.inGroup': 'Dans le groupe {name}',
  'memory.privateBetween': 'Entre les personnes choisies',
  'memory.whoWasThere': 'Qui était là ? (optionnel, tout le groupe voit ce souvenir)',
  'memory.shareWith': 'Seules les personnes choisies verront ce souvenir.',
  'memory.noFriends': 'Invite des ami·es dans un groupe pour pouvoir les choisir.',
  'memory.new.title': 'Nouveau souvenir',
  'memory.new.submit': 'Créer le souvenir',
  'memory.edit.title': 'Modifier le souvenir',
  'memory.edit.button': 'Modifier',
  'memory.notFound': 'Souvenir introuvable',
  'memory.addPhotos': 'Ajouter',
  'memory.photos': 'Photos ({count})',
  'memory.photoUploadFailed': "Le souvenir est créé, mais certaines photos n'ont pas pu être envoyées. Réessaie avec « Ajouter ».",
  'memory.photosHint': 'Tes ami·es pourront aussi ajouter les leurs.',
  'memory.deletePhoto': 'Supprimer cette photo',
  'memory.delete': 'Supprimer le souvenir',
  'memory.deleteConfirm': 'Sûr·e ? Touche encore pour supprimer',
  'server.notInGroup': 'Cette personne ne fait pas partie du groupe',
  'server.unknownPerson': 'Tu ne peux choisir que des membres de tes groupes',
  'server.membersOnly': 'Réservé aux membres du groupe',
  'server.needAudience': 'Choisis un groupe ou au moins un·e ami·e',
  'server.authorOnly': "Réservé à l'auteur du souvenir",
};

type Key = keyof typeof fr;

const en: Record<Key, string> = {
  'auth.headline': 'Your friends, on one map.',
  'auth.tagline': 'Where your classmates, childhood friends and team live. Their birthdays, your memories, your trips.',
  'auth.signIn.title': 'Sign in',
  'auth.signUp.title': 'Create an account',
  'auth.email': 'Email',
  'auth.emailPlaceholder': 'you@example.com',
  'auth.password': 'Password',
  'auth.passwordMin': 'At least {min} characters',
  'auth.signIn.submit': 'Sign in',
  'auth.signUp.submit': 'Create my account',
  'auth.toSignUp': 'No account yet? Sign up',
  'auth.toSignIn': 'I already have an account',
  'auth.confirm.title': 'Confirm your email',
  'auth.confirm.body': 'We sent a confirmation link to {email}. Click it, then come back to sign in.',
  'auth.confirm.done': "I've confirmed, sign me in",
  'auth.error.invalidCredentials': 'Wrong email or password.',
  'auth.error.userExists': 'An account already exists with this email. Sign in instead.',
  'auth.error.weakPassword': 'Password too weak (at least {min} characters).',
  'auth.error.emailNotConfirmed': "Your email isn't confirmed yet. Click the link we emailed you.",
  'auth.error.rateLimit': 'Too many attempts. Try again in a few minutes.',
  'callback.title': 'Oops',
  'callback.invalid': 'Invalid or expired link.',
  'callback.body': 'This link may have already been used or expired. You can still try signing in with your password.',
  'callback.back': 'Back to sign in',

  'onboarding.profile.title': 'Nice to meet you',
  'onboarding.profile.body': 'Pick your photo and your pin color. This is how your friends will see you on the map.',
  'onboarding.location.title': 'Where do you live?',
  'onboarding.step': 'Step {step} of {total}',
  'onboarding.location.search': 'Your city',
  'onboarding.location.private': 'Never your address',
  'onboarding.location.body':
    "Just your city, never your exact location. Your pin goes near the city center, slightly shifted so it doesn't overlap others.",

  'common.continue': 'Continue',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.back': 'Back',
  'common.later': 'Later',
  'common.linkCopied': 'Link copied',
  'common.members_one': '{count} member',
  'common.members_other': '{count} members',

  'profile.name': 'Your first name (or nickname)',
  'profile.namePlaceholder': 'Alex',
  'profile.pinColor': 'Your pin color',
  'profile.emoji': 'An emoji that feels like you (optional)',
  'profile.job': 'Job',
  'profile.jobPlaceholder': 'Designer',
  'profile.company': 'Company',
  'profile.companyPlaceholder': 'Cloud Studio',
  'profile.bio': 'Bio',
  'profile.bioPlaceholder': 'Into hiking and good croissants',
  'profile.socials': 'Socials',
  'profile.changeAvatar': 'Change avatar',
  'social.website': 'Website',
  'social.handle': '@username',
  'social.handleOrUrl': 'username or URL',
  'social.sitePlaceholder': 'mysite.com',

  'me.title': 'My profile',
  'me.city': 'My city',
  'me.since': 'since {date}',
  'me.moved': 'I moved',
  'me.signOut': 'Sign out',

  'city.placeholder': 'London, Lyon, Montreal…',
  'city.none': 'No city found',

  'home.title': 'My groups',
  'home.greeting': 'Hi {name}',
  'home.joinTitle': 'Got an invite code?',
  'home.youAreIn': "You're in {city}",
  'home.createGroup': 'New group',
  'home.empty.title': 'Your map is still empty',
  'home.empty.body': 'Create a group for your classmates or childhood friends, then share the invite link.',
  'home.empty.cta': 'Create my first group',
  'home.codePlaceholder': 'Invite code',
  'home.join': 'Join',

  'group.new.title': 'New group',
  'group.new.body': "One group = one map. You'll be able to invite everyone with a link right after.",
  'group.new.submit': 'Create group',
  'group.name': 'Group name',
  'group.preview': 'Preview',
  'group.namePlaceholder': 'Class of 2020',
  'group.emoji': 'Emoji',
  'group.color': 'Color',
  'group.color.a11y': 'Color {color}',
  'group.notFound': 'Group not found',
  'group.onMap': '{count} on the map',
  'group.alone.title': 'Invite your friends',
  'group.alone.body': "You're all alone on the map for now. Share the link and watch the pins drop.",
  'group.alone.cta': 'Share the invite link',

  'settings.title': 'Group settings',
  'settings.inviteCode': 'Invite code',
  'settings.tapToCopy': 'Tap to copy the link',
  'settings.regenerate': 'Generate a new code',
  'settings.group': 'The group',
  'settings.members': 'Members ({count})',
  'settings.you': ' (you)',
  'settings.admin': 'Admin',
  'settings.noPin': 'No pin yet',
  'settings.remove': 'Remove',
  'settings.removeA11y': 'Remove from group',
  'settings.leave': 'Leave group',
  'settings.leaveConfirm': 'Sure? Tap again to leave',

  'invite.button': 'Invite friends',
  'invite.message': '{emoji} Join “{name}” on Pinpals and drop your pin on the map!\n{url}',
  'join.notFound': "This invite code doesn't exist",
  'join.invited': "You're invited to join",
  'join.count_one': '{count} person has already dropped their pin',
  'join.count_other': '{count} people have already dropped their pin',
  'join.open': 'See the map',
  'join.signUp': 'Create my account and join',
  'join.finishProfile': 'Finish my profile and join',
  'join.join': 'Join the group',

  'member.livesSince': 'in {city} since {date}',

  'server.invalidCoords': 'Invalid coordinates',
  'server.profileNotFound': 'Profile not found',
  'server.invalidCode': 'Invalid code',
  'server.adminOnly': 'Admins only',
  'server.useLeave': 'Use “Leave group” to remove yourself',
  'tabs.groups': 'Groups',
  'tabs.friends': 'Friends',
  'tabs.memories': 'Memories',
  'common.saved': 'Saved',

  'date.dayPlaceholder': 'DD',
  'date.monthPlaceholder': 'MM',
  'date.yearPlaceholder': 'YYYY',
  'date.yearOptional': 'YYYY (optional)',
  'date.invalid': 'Incomplete or impossible date.',

  'profile.birthday': 'Your birthday',
  'profile.section.pin': 'Your pin',
  'profile.section.card': 'Your card',
  'profile.section.cardHint': 'Visible to members of your groups. Everything is optional.',
  'profile.section.more': 'Work, bio and socials',
  'profile.favorites': 'Your favorite things',
  'profile.wishlist': 'Your wishlist (gift ideas)',
  'profile.wishlistPlaceholder': 'A Daft Punk vinyl, plants, a pottery class…',
  'fav.food': 'Food',
  'fav.foodPlaceholder': 'sushi, pizza…',
  'fav.drink': 'Drink',
  'fav.drinkPlaceholder': 'matcha latte, spritz…',
  'fav.music': 'Music',
  'fav.musicPlaceholder': 'Taylor Swift, jazz…',
  'fav.movies': 'Movies & shows',
  'fav.moviesPlaceholder': 'Ghibli, The Office…',
  'fav.books': 'Books',
  'fav.booksPlaceholder': 'Harry Potter, thrillers…',
  'fav.hobbies': 'Hobbies',
  'fav.hobbiesPlaceholder': 'climbing, crochet…',
  'fav.places': 'Places',
  'fav.placesPlaceholder': 'Lisbon, the seaside…',
  'card.empty': 'No card filled in yet.',
  'card.wishlist': 'Wishlist',
  'card.birthday': 'Birthday',

  'friends.title': 'My friends',
  'friends.count': '{count} people in your groups',
  'friends.soon': 'Upcoming birthdays',
  'friends.everyone': 'Everyone',
  'friends.birthdayOn': 'birthday {date}',
  'friends.empty.title': 'No friends here yet',
  'friends.empty.body': 'Members of your groups show up here, with their birthdays.',
  'friends.today': "It's today!",
  'friends.tomorrow': 'Tomorrow',
  'friends.inDays': 'In {count} days',
  'friend.notFound': 'Friend not found',
  'friend.card': 'Their card',
  'friend.address': 'Their address',
  'friend.memories': 'Your memories',
  'friend.addMemory': 'A memory with {name}',
  'friend.noMemories': 'No memories together yet.',
  'friend.private.title': 'My private notes',
  'friend.private.hint': 'Only you can see these.',
  'friend.private.gifts': 'Gift ideas',
  'friend.private.giftsPlaceholder': 'That book they mentioned, a plant…',
  'friend.private.notes': 'Notes',
  'friend.private.notesPlaceholder': "Their cat's name, allergies, what matters to them…",
  'member.openCard': 'See their card',
  'map.layer.friends': 'Friends',
  'map.layer.memories': 'Memories',
  'map.memoriesEmpty.title': 'No memories on the map yet',
  'map.memoriesEmpty.body': 'Pick the city (or the stops of a trip) for your memories to see them here.',
  'city.here': '{count} friends here',
  'city.around': '{count} friends around here',
  'city.seeCard': 'See their card',
  'common.close': 'Close',
  'memory.open': 'Open memory',
  'memory.stopsCount': '{count} stops',

  'address.title': 'My address',
  'address.private': 'Private',
  'address.hint': 'Never shown on the map. Only the friends you choose can see it, to send you a card or a gift.',
  'address.line1': 'Address',
  'address.line2': 'Apt, suite, floor…',
  'address.postalCode': 'Postal code',
  'address.city': 'City',
  'address.country': 'Country',
  'address.sharedWith': 'Who can see my address?',
  'address.delete': 'Delete my address',

  'memories.title': 'Memories',
  'memories.groupTitle': 'Group memories',
  'memories.timelineTitle': 'Our story',
  'memories.add': 'Add a memory',
  'memories.addBody': 'A night out, a trip, photos to share.',
  'memories.eyebrow': 'Your scrapbook',
  'memories.filter.all': 'All',
  'memories.empty.title': 'The scrapbook is empty',
  'memories.empty.body': 'Add a memory or a trip, with photos, to share with your friends.',
  'memories.empty.group': 'Add the group’s first memory: a party, a trip, a class photo…',
  'memory.kind.memory': 'Memory',
  'memory.kind.trip': 'Trip',
  'memory.title': 'Title',
  'memory.titlePlaceholder': "Lea's surprise birthday",
  'memory.titlePlaceholderTrip': 'Road trip in Portugal',
  'memory.date': 'Date',
  'memory.from': 'From',
  'memory.to': 'To',
  'memory.badRange': 'The end date must be after the start date.',
  'memory.body': 'What happened',
  'memory.bodyPlaceholder': 'Tell the story: the laughs, the mishaps, the best moment…',
  'memory.audience': 'With whom?',
  'memory.section.story': 'The memory',
  'memory.where.memory': 'Where?',
  'memory.where.trip': 'Stops',
  'memory.where.memoryHint': 'Just the city: the memory will show up on the group map.',
  'memory.where.tripHint': 'The cities in the order you visited them: the route will show on the group map.',
  'memory.where.add': 'Pick a city',
  'memory.where.addStop': 'Add a stop',
  'memory.where.change': 'Change city',
  'memory.where.remove': 'Remove {name}',
  'memory.audienceFriends': 'Friends',
  'memory.inGroup': 'In the group {name}',
  'memory.privateBetween': 'Between the chosen people',
  'memory.whoWasThere': 'Who was there? (optional, the whole group sees this memory)',
  'memory.shareWith': 'Only the people you choose will see this memory.',
  'memory.noFriends': 'Invite friends into a group to be able to pick them.',
  'memory.new.title': 'New memory',
  'memory.new.submit': 'Create memory',
  'memory.edit.title': 'Edit memory',
  'memory.edit.button': 'Edit',
  'memory.notFound': 'Memory not found',
  'memory.addPhotos': 'Add',
  'memory.photos': 'Photos ({count})',
  'memory.photoUploadFailed': 'The memory was created, but some photos failed to upload. Try again with “Add”.',
  'memory.photosHint': 'Your friends can add theirs too.',
  'memory.deletePhoto': 'Delete this photo',
  'memory.delete': 'Delete memory',
  'memory.deleteConfirm': 'Sure? Tap again to delete',
  'server.notInGroup': "This person isn't in the group",
  'server.unknownPerson': 'You can only pick members of your groups',
  'server.membersOnly': 'Group members only',
  'server.needAudience': 'Pick a group or at least one friend',
  'server.authorOnly': 'Only the author can do this',
};

const dictionaries: Record<Lang, Record<Key, string>> = { fr, en };

type Params = Record<string, string | number>;

export function t(key: Key, params?: Params): string {
  const template = dictionaries[lang][key];
  return params ? template.replace(/\{(\w+)\}/g, (m, name: string) => String(params[name] ?? m)) : template;
}

/** Pluriel simple : `<key>_one` / `<key>_other`. */
export function tn(key: 'common.members' | 'join.count', count: number): string {
  return t(`${key}_${count > 1 ? 'other' : 'one'}`, { count });
}

// Les RPC lèvent des exceptions en français : on les traduit à l'affichage.
const SERVER_MESSAGES: Record<string, Key> = {
  'Coordonnées invalides': 'server.invalidCoords',
  'Profil introuvable': 'server.profileNotFound',
  'Code invalide': 'server.invalidCode',
  'Réservé aux admins': 'server.adminOnly',
  'Utilise leave_group pour te retirer': 'server.useLeave',
  'Personne hors du groupe': 'server.notInGroup',
  'Personne inconnue': 'server.unknownPerson',
  'Réservé aux membres du groupe': 'server.membersOnly',
  'Choisis un groupe ou au moins un·e ami·e': 'server.needAudience',
  "Réservé à l'auteur": 'server.authorOnly',
};

export function translateServerMessage(message: string): string {
  const key = SERVER_MESSAGES[message];
  return key ? t(key) : message;
}

const MONTHS: Record<Lang, string[]> = {
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

export function monthName(month: number): string {
  return MONTHS[lang][month];
}

/** "12 mars" / "March 12" */
export function formatDayMonth(day: number, month: number): string {
  return lang === 'fr' ? `${day === 1 ? '1er' : day} ${monthName(month - 1)}` : `${monthName(month - 1)} ${day}`;
}

/** "2025-07-01" -> "1er juillet 2025" / "July 1, 2025" */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return lang === 'fr' ? `${formatDayMonth(d, m)} ${y}` : `${formatDayMonth(d, m)}, ${y}`;
}

/** Période d'un voyage : "1er – 10 juillet 2025", ou une seule date. */
export function formatDateRange(start: string | null, end: string | null): string | null {
  if (!start) return null;
  if (!end || end.slice(0, 10) === start.slice(0, 10)) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/** Jours avant le prochain anniversaire (0 = aujourd'hui). */
export function daysUntilBirthday(day: number, month: number, today = new Date()): number {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let next = new Date(today.getFullYear(), month - 1, day);
  if (next < start) next = new Date(today.getFullYear() + 1, month - 1, day);
  return Math.round((next.getTime() - start.getTime()) / 86_400_000);
}
