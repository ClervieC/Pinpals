export type Socials = Partial<Record<SocialKey, string>>;
export type SocialKey = 'instagram' | 'linkedin' | 'x' | 'website';

export type FavoriteKey = 'food' | 'drink' | 'music' | 'movies' | 'books' | 'hobbies' | 'places';
export type Favorites = Partial<Record<FavoriteKey, string>>;

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  pin_color: string;
  pin_emoji: string | null;
  bio: string | null;
  job_title: string | null;
  company: string | null;
  socials: Socials;
  city: string | null;
  country: string | null;
  country_code: string | null;
  lat: number | null;
  lng: number | null;
  location_updated_at: string | null;
  birthday_day: number | null;
  birthday_month: number | null;
  birth_year: number | null;
  favorites: Favorites;
  wishlist: string | null;
  created_at: string;
};

export type ProfileInput = Pick<Profile, 'display_name' | 'pin_color'> &
  Partial<
    Pick<
      Profile,
      | 'avatar_url'
      | 'pin_emoji'
      | 'bio'
      | 'job_title'
      | 'company'
      | 'socials'
      | 'birthday_day'
      | 'birthday_month'
      | 'birth_year'
      | 'favorites'
      | 'wishlist'
    >
  >;

export type Role = 'admin' | 'member';

export type MyGroup = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  invite_code: string;
  role: Role;
  member_count: number;
  created_at: string;
};

export type GroupPreview = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  member_count: number;
};

/** Une ligne renvoyée par la RPC get_group_map. */
export type MapMember = Pick<
  Profile,
  | 'id'
  | 'display_name'
  | 'avatar_url'
  | 'pin_color'
  | 'pin_emoji'
  | 'bio'
  | 'job_title'
  | 'company'
  | 'socials'
  | 'city'
  | 'country'
  | 'country_code'
  | 'location_updated_at'
> & { lat: number; lng: number; role: Role };

export type GroupMember = {
  role: Role;
  joined_at: string;
  profile: Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'pin_color' | 'city' | 'country_code'>;
};

export type City = {
  id: string;
  name: string;
  /** Région / état, pour distinguer les homonymes. */
  region: string | null;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
};

/** Adresse postale : jamais sur la carte, visible seulement par les ami·es choisi·es. */
export type Address = {
  user_id: string;
  line1: string;
  line2: string | null;
  postal_code: string | null;
  city: string;
  country: string | null;
  updated_at: string;
};

export type AddressInput = Pick<Address, 'line1' | 'city'> & Partial<Pick<Address, 'line2' | 'postal_code' | 'country'>>;

/** Notes privées sur un·e ami·e : visibles uniquement par leur auteur. */
export type FriendNote = {
  friend_id: string;
  gift_ideas: string | null;
  notes: string | null;
};

export type MemoryKind = 'memory' | 'trip';

export type Memory = {
  id: string;
  author_id: string;
  group_id: string | null;
  kind: MemoryKind;
  title: string;
  body: string | null;
  place: string | null;
  happened_on: string | null;
  ends_on: string | null;
  created_at: string;
};

/** Une ville où s'est passé un souvenir (centre-ville, jamais une adresse). */
export type MemoryStop = { name: string; country_code: string | null; lat: number; lng: number };

/** Une ligne renvoyée par la RPC get_memories. */
export type MemorySummary = Memory & {
  cover_path: string | null;
  photo_count: number;
  people: string[];
  /** Les 3 premières photos, pour les aperçus. */
  photo_paths: string[];
  stops: MemoryStop[];
};

export type MemoryPhoto = { id: string; memory_id: string; path: string; uploaded_by: string; created_at: string };

export type MemoryInput = {
  kind: MemoryKind;
  title: string;
  body: string | null;
  place: string | null;
  happened_on: string | null;
  ends_on: string | null;
};

/** Profil d'un·e ami·e (quelqu'un avec qui je partage au moins un groupe). */
export type Friend = Profile;
