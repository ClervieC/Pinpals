import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { decode } from 'base64-arraybuffer';

import { useUserId } from './auth';
import { supabase } from './supabase';
import type {
  Address,
  AddressInput,
  City,
  Friend,
  FriendNote,
  GroupMember,
  GroupPreview,
  MapMember,
  Memory,
  MemoryInput,
  MemoryPhoto,
  MemoryStop,
  MemorySummary,
  MyGroup,
  Profile,
  ProfileInput,
} from './types';

export const keys = {
  profile: (uid: string) => ['profile', uid] as const,
  myGroups: ['my-groups'] as const,
  groupMap: (gid: string) => ['group-map', gid] as const,
  groupMembers: (gid: string) => ['group-members', gid] as const,
  preview: (code: string) => ['group-preview', code] as const,
  friends: ['friends'] as const,
  myAddress: ['my-address'] as const,
  addressShares: ['address-shares'] as const,
  friendAddress: (fid: string) => ['friend-address', fid] as const,
  friendNote: (fid: string) => ['friend-note', fid] as const,
  memories: (filter: MemoryFilter) => ['memories', filter.groupId ?? null, filter.friendId ?? null] as const,
  memory: (mid: string) => ['memory', mid] as const,
  signedUrls: (paths: string[]) => ['signed-urls', ...paths] as const,
};

export type MemoryFilter = { groupId?: string; friendId?: string };

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

// --- Profil -----------------------------------------------------------------

export function useProfile(uid: string | undefined) {
  return useQuery({
    queryKey: keys.profile(uid ?? ''),
    enabled: !!uid,
    queryFn: async () =>
      unwrap<Profile | null>(await supabase.from('profiles').select('*').eq('id', uid!).maybeSingle()),
  });
}

export function useMyProfile() {
  return useProfile(useUserId());
}

export function useSaveProfile() {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProfileInput) =>
      unwrap<Profile>(await supabase.from('profiles').upsert({ id: uid, ...input }).select().single()),
    onSuccess: (profile) => {
      qc.setQueryData(keys.profile(uid), profile);
      qc.invalidateQueries({ queryKey: ['group-map'] });
    },
  });
}

export function useSetLocation() {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (city: City) =>
      unwrap(
        await supabase.rpc('set_my_location', {
          p_city: city.name,
          p_country: city.country,
          p_country_code: city.countryCode,
          p_lat: city.lat,
          p_lng: city.lng,
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.profile(uid) });
      qc.invalidateQueries({ queryKey: ['group-map'] });
    },
  });
}

/** Upload dans avatars/<uid>/<timestamp>.<ext> et renvoie l'URL publique. */
export async function uploadAvatar(uid: string, base64: string, mimeType = 'image/jpeg'): Promise<string> {
  const ext = mimeType.split('/')[1] ?? 'jpg';
  const path = `${uid}/${Date.now()}.${ext}`;
  unwrap(await supabase.storage.from('avatars').upload(path, decode(base64), { contentType: mimeType }));
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

// --- Groupes ----------------------------------------------------------------

export function useMyGroups(enabled = true) {
  return useQuery({
    queryKey: keys.myGroups,
    enabled,
    queryFn: async () => unwrap<MyGroup[]>(await supabase.rpc('get_my_groups')),
  });
}

/** Le groupe courant, lu depuis la liste de mes groupes (déjà en cache la plupart du temps). */
export function useGroup(gid: string) {
  const query = useMyGroups();
  return { ...query, data: query.data?.find((g) => g.id === gid) };
}

export function useGroupMap(gid: string) {
  return useQuery({
    queryKey: keys.groupMap(gid),
    queryFn: async () => unwrap<MapMember[]>(await supabase.rpc('get_group_map', { gid })),
  });
}

export function useGroupMembers(gid: string) {
  return useQuery({
    queryKey: keys.groupMembers(gid),
    enabled: !!gid,
    queryFn: async () =>
      unwrap<GroupMember[]>(
        await supabase
          .from('group_members')
          .select('role, joined_at, profile:profiles(id, display_name, avatar_url, pin_color, city, country_code)')
          .eq('group_id', gid)
          .order('joined_at')
          .overrideTypes<GroupMember[]>(),
      ),
  });
}

export function useGroupPreview(code: string) {
  return useQuery({
    queryKey: keys.preview(code),
    queryFn: async () => {
      const rows = unwrap<GroupPreview[]>(await supabase.rpc('get_group_preview', { code }));
      return rows[0] ?? null;
    },
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; emoji: string; color: string }) =>
      unwrap<string>(
        await supabase.rpc('create_group', { p_name: input.name, p_emoji: input.emoji, p_color: input.color }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.myGroups }),
  });
}

export function useJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => unwrap<string>(await supabase.rpc('join_group', { code })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.myGroups }),
  });
}

export function useUpdateGroup(gid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Pick<MyGroup, 'name' | 'emoji' | 'color'>>) =>
      unwrap(await supabase.from('groups').update(patch).eq('id', gid)),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.myGroups }),
  });
}

export function useRegenerateInviteCode(gid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap<string>(await supabase.rpc('regenerate_invite_code', { gid })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.myGroups }),
  });
}

export function useLeaveGroup(gid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('leave_group', { gid })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.myGroups });
      qc.removeQueries({ queryKey: keys.groupMap(gid) });
    },
  });
}

export function useRemoveMember(gid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uid: string) => unwrap(await supabase.rpc('remove_member', { gid, uid })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.groupMembers(gid) });
      qc.invalidateQueries({ queryKey: keys.groupMap(gid) });
      qc.invalidateQueries({ queryKey: keys.myGroups });
    },
  });
}

// --- Ami·es -----------------------------------------------------------------

/** Les personnes avec qui je partage au moins un groupe (la RLS de profiles fait le filtre). */
export function useFriends() {
  const uid = useUserId();
  return useQuery({
    queryKey: keys.friends,
    queryFn: async () =>
      unwrap<Friend[]>(await supabase.from('profiles').select('*').neq('id', uid).order('display_name')),
  });
}

// --- Adresse (privée) ---------------------------------------------------------

export function useMyAddress() {
  const uid = useUserId();
  return useQuery({
    queryKey: keys.myAddress,
    queryFn: async () =>
      unwrap<Address | null>(await supabase.from('addresses').select('*').eq('user_id', uid).maybeSingle()),
  });
}

export function useSaveAddress() {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddressInput) =>
      unwrap<Address>(
        await supabase
          .from('addresses')
          .upsert({ user_id: uid, ...input, updated_at: new Date().toISOString() })
          .select()
          .single(),
      ),
    onSuccess: (address) => qc.setQueryData(keys.myAddress, address),
  });
}

export function useDeleteAddress() {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap(await supabase.from('addresses').delete().eq('user_id', uid)),
    onSuccess: () => qc.setQueryData(keys.myAddress, null),
  });
}

/** Les ami·es à qui j'ai partagé mon adresse. */
export function useAddressShares() {
  const uid = useUserId();
  return useQuery({
    queryKey: keys.addressShares,
    queryFn: async () => {
      const rows = unwrap<{ viewer_id: string }[]>(
        await supabase.from('address_shares').select('viewer_id').eq('owner_id', uid),
      );
      return rows.map((r) => r.viewer_id);
    },
  });
}

export function useToggleAddressShare() {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ viewerId, shared }: { viewerId: string; shared: boolean }) =>
      shared
        ? unwrap(await supabase.from('address_shares').insert({ owner_id: uid, viewer_id: viewerId }))
        : unwrap(await supabase.from('address_shares').delete().eq('owner_id', uid).eq('viewer_id', viewerId)),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.addressShares }),
  });
}

/** L'adresse d'un·e ami·e, si elle ou il me l'a partagée (sinon null). */
export function useFriendAddress(fid: string) {
  return useQuery({
    queryKey: keys.friendAddress(fid),
    queryFn: async () =>
      unwrap<Address | null>(await supabase.from('addresses').select('*').eq('user_id', fid).maybeSingle()),
  });
}

// --- Notes privées ------------------------------------------------------------

export function useFriendNote(fid: string) {
  const uid = useUserId();
  return useQuery({
    queryKey: keys.friendNote(fid),
    queryFn: async () =>
      unwrap<FriendNote | null>(
        await supabase
          .from('friend_notes')
          .select('friend_id, gift_ideas, notes')
          .eq('author_id', uid)
          .eq('friend_id', fid)
          .maybeSingle(),
      ),
  });
}

export function useSaveFriendNote(fid: string) {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Pick<FriendNote, 'gift_ideas' | 'notes'>) =>
      unwrap<FriendNote>(
        await supabase
          .from('friend_notes')
          .upsert({ author_id: uid, friend_id: fid, ...input, updated_at: new Date().toISOString() })
          .select('friend_id, gift_ideas, notes')
          .single(),
      ),
    onSuccess: (note) => qc.setQueryData(keys.friendNote(fid), note),
  });
}

// --- Souvenirs ------------------------------------------------------------------

const MEMORIES_BUCKET = 'memories';

export function useMemories(filter: MemoryFilter = {}) {
  return useQuery({
    queryKey: keys.memories(filter),
    queryFn: async () =>
      unwrap<MemorySummary[]>(
        await supabase.rpc('get_memories', {
          p_group_id: filter.groupId ?? null,
          p_friend_id: filter.friendId ?? null,
        }),
      ),
  });
}

export type MemoryDetail = Memory & { photos: MemoryPhoto[]; people: string[]; stops: MemoryStop[] };

export function useMemory(mid: string) {
  return useQuery({
    queryKey: keys.memory(mid),
    queryFn: async () => {
      const memory = unwrap<Memory | null>(await supabase.from('memories').select('*').eq('id', mid).maybeSingle());
      if (!memory) return null;
      const [photos, people, stops] = await Promise.all([
        supabase.from('memory_photos').select('*').eq('memory_id', mid).order('created_at'),
        supabase.from('memory_people').select('user_id').eq('memory_id', mid),
        supabase.from('memory_stops').select('name, country_code, lat, lng').eq('memory_id', mid).order('position'),
      ]);
      return {
        ...memory,
        photos: unwrap<MemoryPhoto[]>(photos),
        people: unwrap<{ user_id: string }[]>(people).map((p) => p.user_id),
        stops: unwrap<MemoryStop[]>(stops),
      } satisfies MemoryDetail;
    },
  });
}

export function useCreateMemory() {
  const qc = useQueryClient();
  return useMutation({
    // Les photos partent juste après la création : le chemin du bucket contient l'id du souvenir.
    mutationFn: async ({
      photos = [],
      stops = [],
      ...input
    }: MemoryInput & { groupId: string | null; people: string[]; photos?: PhotoUpload[]; stops?: MemoryStop[] }) => {
      const mid = unwrap<string>(
        await supabase.rpc('create_memory', {
          p_title: input.title,
          p_kind: input.kind,
          p_body: input.body,
          p_place: input.place,
          p_happened_on: input.happened_on,
          p_ends_on: input.ends_on,
          p_group_id: input.groupId,
          p_people: input.people,
        }),
      );
      if (stops.length) unwrap(await supabase.rpc('set_memory_stops', { mid, p_stops: stops }));
      // Souvenir créé même si une photo échoue : on renvoie l'erreur au lieu de lever,
      // pour ne pas rester sur le formulaire (un second envoi créerait un doublon).
      try {
        await uploadMemoryPhotos(mid, photos);
        return { id: mid, photoError: null as unknown };
      } catch (photoError) {
        return { id: mid, photoError };
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['memories'] }),
  });
}

export function useUpdateMemory(mid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ people, stops, ...patch }: MemoryInput & { people: string[]; stops: MemoryStop[] }) => {
      unwrap(await supabase.from('memories').update(patch).eq('id', mid));
      unwrap(await supabase.rpc('set_memory_people', { mid, p_people: people }));
      unwrap(await supabase.rpc('set_memory_stops', { mid, p_stops: stops }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.memory(mid) });
      qc.invalidateQueries({ queryKey: ['memories'] });
    },
  });
}

/** Supprime les fichiers du bucket avant la ligne (la cascade SQL ne touche pas au stockage). */
export function useDeleteMemory(mid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (paths: string[]) => {
      if (paths.length) unwrap(await supabase.storage.from(MEMORIES_BUCKET).remove(paths));
      unwrap(await supabase.from('memories').delete().eq('id', mid));
    },
    onSuccess: () => {
      qc.removeQueries({ queryKey: keys.memory(mid) });
      qc.invalidateQueries({ queryKey: ['memories'] });
    },
  });
}

export type PhotoUpload = { base64: string; mimeType: string };

/** Upload dans memories/<memory_id>/<horodatage>.<ext> puis enregistre la photo. */
async function uploadMemoryPhotos(mid: string, images: PhotoUpload[]) {
  for (const image of images) {
    const ext = image.mimeType.split('/')[1] ?? 'jpg';
    const path = `${mid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    unwrap(await supabase.storage.from(MEMORIES_BUCKET).upload(path, decode(image.base64), { contentType: image.mimeType }));
    unwrap(await supabase.from('memory_photos').insert({ memory_id: mid, path }));
  }
}

export function useAddMemoryPhotos(mid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (images: PhotoUpload[]) => uploadMemoryPhotos(mid, images),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.memory(mid) });
      qc.invalidateQueries({ queryKey: ['memories'] });
    },
  });
}

export function useDeleteMemoryPhoto(mid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (photo: MemoryPhoto) => {
      unwrap(await supabase.storage.from(MEMORIES_BUCKET).remove([photo.path]));
      unwrap(await supabase.from('memory_photos').delete().eq('id', photo.id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.memory(mid) });
      qc.invalidateQueries({ queryKey: ['memories'] });
    },
  });
}

/** Bucket privé : URLs signées valables 1 h, rafraîchies avant expiration. */
export function useSignedUrls(paths: string[]) {
  return useQuery({
    queryKey: keys.signedUrls(paths),
    enabled: paths.length > 0,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const rows = unwrap(await supabase.storage.from(MEMORIES_BUCKET).createSignedUrls(paths, 3600));
      return Object.fromEntries(rows.flatMap((r) => (r.path && r.signedUrl ? [[r.path, r.signedUrl]] : []))) as Record<
        string,
        string
      >;
    },
  });
}
