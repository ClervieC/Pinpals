export type Socials = Partial<Record<SocialKey, string>>;
export type SocialKey = 'instagram' | 'linkedin' | 'x' | 'website';

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
  created_at: string;
};

export type ProfileInput = Pick<Profile, 'display_name' | 'pin_color'> &
  Partial<Pick<Profile, 'avatar_url' | 'pin_emoji' | 'bio' | 'job_title' | 'company' | 'socials'>>;

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
