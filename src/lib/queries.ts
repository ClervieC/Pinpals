import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { decode } from 'base64-arraybuffer';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { useUserId } from './auth';
import { supabase } from './supabase';
import type {
  Address,
  AppNotification,
  AddressInput,
  City,
  Friend,
  FriendNoteInput,
  FriendPrivateNote,
  GroupInvitation,
  GroupMember,
  GroupPreview,
  InvitableFriend,
  MapMember,
  Memory,
  MemoryComment,
  MemoryInput,
  MemoryPhoto,
  PhotoComment,
  PhotoLike,
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
  invitable: (gid: string) => ['invitable-friends', gid] as const,
  myInvitations: ['my-invitations'] as const,
  notifications: ['notifications'] as const,
  unreadNotifications: ['notifications', 'unread'] as const,
  friends: ['friends'] as const,
  myAddress: ['my-address'] as const,
  addressShares: ['address-shares'] as const,
  friendAddress: (fid: string) => ['friend-address', fid] as const,
  friendNotes: (fid: string) => ['friend-notes', fid] as const,
  memories: (filter: MemoryFilter) => ['memories', filter.groupId ?? null, filter.friendId ?? null] as const,
  memory: (mid: string) => ['memory', mid] as const,
  memoryComments: (mid: string) => ['memory-comments', mid] as const,
  photoSocial: (mid: string) => ['photo-social', mid] as const,
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

// --- Suppression de compte --------------------------------------------------------

/** Supprime des fichiers par lots (l'API storage limite la taille d'une requête). */
async function removeFiles(bucket: string, paths: string[]) {
  for (let i = 0; i < paths.length; i += 100) {
    unwrap(await supabase.storage.from(bucket).remove(paths.slice(i, i + 100)));
  }
}

/**
 * Supprime définitivement le compte. D'abord les fichiers (seule l'API storage peut les effacer) :
 * l'avatar, mes photos, et les photos des souvenirs que j'ai écrits (ces souvenirs vont disparaître).
 * Puis delete_my_account() quitte chaque groupe et supprime l'utilisateur ; le reste suit en cascade.
 */
export function useDeleteAccount() {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const avatars = unwrap(await supabase.storage.from('avatars').list(uid, { limit: 1000 }));
      await removeFiles('avatars', avatars.map((f) => `${uid}/${f.name}`));

      type Row = Pick<MemoryPhoto, 'path' | 'thumb_path'>;
      const [mine, onMyMemories] = await Promise.all([
        supabase.from('memory_photos').select('path, thumb_path').eq('uploaded_by', uid),
        supabase.from('memory_photos').select('path, thumb_path, memories!inner(author_id)').eq('memories.author_id', uid),
      ]);
      const files = new Set([...unwrap<Row[]>(mine), ...unwrap<Row[]>(onMyMemories)].flatMap(photoFiles));
      await removeFiles(MEMORIES_BUCKET, [...files]);

      unwrap(await supabase.rpc('delete_my_account'));
    },
    onSuccess: async () => {
      // Le compte n'existe plus : on oublie la session locale et toutes les données en cache.
      await supabase.auth.signOut({ scope: 'local' });
      qc.clear();
    },
  });
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.myGroups });
      // Rejoindre par lien efface une éventuelle invitation en attente pour ce groupe.
      qc.invalidateQueries({ queryKey: keys.myInvitations });
    },
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

// --- Invitations entre ami·es ------------------------------------------------

/** Mes ami·es pas encore dans ce groupe : on ne peut inviter que des gens qu'on connaît déjà. */
export function useInvitableFriends(gid: string) {
  return useQuery({
    queryKey: keys.invitable(gid),
    enabled: !!gid,
    queryFn: async () => unwrap<InvitableFriend[]>(await supabase.rpc('get_invitable_friends', { gid })),
  });
}

/** Inviter ou retirer l'invitation, avec mise à jour instantanée du bouton. */
export function useToggleGroupInvitation(gid: string) {
  const qc = useQueryClient();
  const key = keys.invitable(gid);
  return useMutation({
    mutationFn: async ({ uid, invite }: { uid: string; invite: boolean }) =>
      unwrap(await supabase.rpc(invite ? 'invite_to_group' : 'cancel_group_invitation', { gid, uid })),
    onMutate: async ({ uid, invite }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<InvitableFriend[]>(key);
      qc.setQueryData<InvitableFriend[]>(key, (list) => list?.map((f) => (f.id === uid ? { ...f, invited: invite } : f)));
      return { previous };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useMyInvitations() {
  return useQuery({
    queryKey: keys.myInvitations,
    queryFn: async () => unwrap<GroupInvitation[]>(await supabase.rpc('get_my_invitations')),
  });
}

export function useRespondToInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ gid, accept }: { gid: string; accept: boolean }) =>
      unwrap(await supabase.rpc('respond_to_invitation', { gid, accept })),
    onSuccess: (_d, { accept }) => {
      qc.invalidateQueries({ queryKey: keys.myInvitations });
      if (accept) {
        qc.invalidateQueries({ queryKey: keys.myGroups });
        qc.invalidateQueries({ queryKey: keys.friends });
      }
    },
  });
}

// --- Notifications dans l'app ------------------------------------------------
// Pas de push : elles sont relues à l'ouverture de l'app et au retour au premier plan.

export function useNotifications() {
  const query = useInfiniteQuery({
    queryKey: keys.notifications,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      unwrap<AppNotification[]>(
        await supabase.rpc('get_my_notifications').range(pageParam, pageParam + PAGE_SIZE - 1),
      ),
    getNextPageParam: (last, pages) => (last.length < PAGE_SIZE ? undefined : pages.length * PAGE_SIZE),
  });
  return { ...query, items: query.data?.pages.flat() ?? [] };
}

export function useUnreadNotifications() {
  return useQuery({
    queryKey: keys.unreadNotifications,
    queryFn: async () => Number(unwrap<number>(await supabase.rpc('count_unread_notifications'))),
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('mark_notifications_read')),
    onSuccess: () => {
      qc.setQueryData(keys.unreadNotifications, 0);
      // La liste affichée garde ses « nouveau » pendant la visite ; la prochaine ouverture la relit.
      qc.invalidateQueries({ queryKey: keys.notifications, exact: true, refetchType: 'none' });
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

/** Mes notes sur un·e ami·e, des plus anciennes aux plus récentes. Visibles uniquement par moi. */
export function useFriendPrivateNotes(fid: string) {
  const uid = useUserId();
  return useQuery({
    queryKey: keys.friendNotes(fid),
    queryFn: async () =>
      unwrap<FriendPrivateNote[]>(
        await supabase
          .from('friend_private_notes')
          .select('id, friend_id, kind, body, created_at, updated_at')
          .eq('author_id', uid)
          .eq('friend_id', fid)
          .order('created_at'),
      ),
  });
}

export function useAddFriendNote(fid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: FriendNoteInput) => {
      unwrap(await supabase.from('friend_private_notes').insert({ friend_id: fid, kind: input.kind, body: input.body.trim() }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.friendNotes(fid) }),
  });
}

export function useUpdateFriendNote(fid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: FriendNoteInput & { id: string }) => {
      unwrap(
        await supabase
          .from('friend_private_notes')
          .update({ kind: input.kind, body: input.body.trim(), updated_at: new Date().toISOString() })
          .eq('id', id),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.friendNotes(fid) }),
  });
}

export function useDeleteFriendNote(fid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('friend_private_notes').delete().eq('id', id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.friendNotes(fid) }),
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

/** Taille des pages de souvenirs et de commentaires. */
export const PAGE_SIZE = 20;

/**
 * Souvenirs par pages de PAGE_SIZE (listes et fils), du plus récent au plus ancien.
 * La carte garde useMemories : elle a besoin de tous les pins d'un coup.
 * Clé sous ['memories', …] : les invalidations existantes s'appliquent aussi aux pages.
 */
export function useMemoriesPaged(filter: MemoryFilter = {}) {
  const query = useInfiniteQuery({
    queryKey: [...keys.memories(filter), 'paged'],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      unwrap<MemorySummary[]>(
        await supabase
          .rpc('get_memories', { p_group_id: filter.groupId ?? null, p_friend_id: filter.friendId ?? null })
          .range(pageParam, pageParam + PAGE_SIZE - 1),
      ),
    // Page incomplète : c'était la dernière.
    getNextPageParam: (last, pages) => (last.length < PAGE_SIZE ? undefined : pages.length * PAGE_SIZE),
  });
  return { ...query, items: query.data?.pages.flat() ?? [] };
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

/** `uri` (image choisie dans la galerie) sert à générer la miniature ; sans elle, pas de miniature. */
export type PhotoUpload = { base64: string; mimeType: string; uri?: string };

/** Largeur des miniatures : assez pour les murs de polaroïds et les cartes, ~30-60 Ko. */
const THUMB_WIDTH = 480;

/** Miniature JPEG en base64 ; null si la génération échoue (la photo est quand même envoyée). */
async function makeThumbnail(uri: string): Promise<string | null> {
  try {
    const context = ImageManipulator.manipulate(uri);
    context.resize({ width: THUMB_WIDTH, height: null });
    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
    return result.base64 ?? null;
  } catch {
    return null;
  }
}

/** Upload dans memories/<memory_id>/<horodatage>.<ext> (+ miniature .thumb.jpg) puis enregistre la photo. */
async function uploadMemoryPhotos(mid: string, images: PhotoUpload[]) {
  const bucket = supabase.storage.from(MEMORIES_BUCKET);
  for (const image of images) {
    const ext = image.mimeType.split('/')[1] ?? 'jpg';
    const base = `${mid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const path = `${base}.${ext}`;
    unwrap(await bucket.upload(path, decode(image.base64), { contentType: image.mimeType }));

    let thumbPath: string | null = null;
    const thumb = image.uri ? await makeThumbnail(image.uri) : null;
    if (thumb) {
      const { error } = await bucket.upload(`${base}.thumb.jpg`, decode(thumb), { contentType: 'image/jpeg' });
      if (!error) thumbPath = `${base}.thumb.jpg`;
    }
    unwrap(await supabase.from('memory_photos').insert({ memory_id: mid, path, thumb_path: thumbPath }));
  }
}

/** Fichiers d'une photo dans le bucket : l'original et sa miniature éventuelle. */
export function photoFiles(photo: Pick<MemoryPhoto, 'path' | 'thumb_path'>): string[] {
  return photo.thumb_path ? [photo.path, photo.thumb_path] : [photo.path];
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
      unwrap(await supabase.storage.from(MEMORIES_BUCKET).remove(photoFiles(photo)));
      unwrap(await supabase.from('memory_photos').delete().eq('id', photo.id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.memory(mid) });
      qc.invalidateQueries({ queryKey: ['memories'] });
    },
  });
}

// --- Commentaires --------------------------------------------------------------

/**
 * Commentaires d'un souvenir, les PAGE_SIZE plus récents d'abord ; « plus anciens » charge la page suivante.
 * `items` est remis dans l'ordre chronologique pour l'affichage ; `total` compte tous les commentaires.
 */
export function useMemoryComments(mid: string) {
  const query = useInfiniteQuery({
    queryKey: keys.memoryComments(mid),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error, count } = await supabase
        .from('memory_comments')
        .select('*, author:profiles!memory_comments_author_id_fkey(id, display_name, avatar_url, pin_color)', {
          count: 'exact',
        })
        .eq('memory_id', mid)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      if (error) throw new Error(error.message);
      return { rows: (data ?? []) as MemoryComment[], total: count ?? 0 };
    },
    getNextPageParam: (last, pages) => (last.rows.length < PAGE_SIZE ? undefined : pages.length * PAGE_SIZE),
  });
  const pages = query.data?.pages ?? [];
  return {
    ...query,
    items: pages.flatMap((p) => p.rows).reverse(),
    total: pages[0]?.total ?? 0,
  };
}

export function useAddMemoryComment(mid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      unwrap(await supabase.from('memory_comments').insert({ memory_id: mid, body: body.trim() }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.memoryComments(mid) }),
  });
}

export function useDeleteMemoryComment(mid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('memory_comments').delete().eq('id', id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.memoryComments(mid) }),
  });
}

// --- Photos : date, légende, likes, commentaires ------------------------------------

/** Likes et commentaires de toutes les photos d'un souvenir, en deux requêtes. */
export function usePhotoSocial(mid: string, photoIds: string[]) {
  return useQuery({
    queryKey: [...keys.photoSocial(mid), ...photoIds],
    enabled: photoIds.length > 0,
    queryFn: async () => {
      const [likes, comments] = await Promise.all([
        supabase.from('memory_photo_likes').select('photo_id, user_id').in('photo_id', photoIds),
        supabase
          .from('memory_photo_comments')
          .select('*, author:profiles!memory_photo_comments_author_id_fkey(id, display_name, avatar_url, pin_color)')
          .in('photo_id', photoIds)
          .order('created_at'),
      ]);
      return { likes: unwrap<PhotoLike[]>(likes), comments: unwrap<PhotoComment[]>(comments) };
    },
  });
}

export function useUpdateMemoryPhoto(mid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, taken_on, caption }: Pick<MemoryPhoto, 'id' | 'taken_on' | 'caption'>) => {
      unwrap(await supabase.from('memory_photos').update({ taken_on, caption: caption?.trim() || null }).eq('id', id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.memory(mid) }),
  });
}

type PhotoSocial = { likes: PhotoLike[]; comments: PhotoComment[] };

/** Like instantané : le cœur change tout de suite (mise à jour optimiste), annulée si le serveur refuse. */
export function useTogglePhotoLike(mid: string) {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ photoId, liked }: { photoId: string; liked: boolean }) => {
      unwrap(
        liked
          ? await supabase.from('memory_photo_likes').delete().eq('photo_id', photoId).eq('user_id', uid)
          : await supabase.from('memory_photo_likes').insert({ photo_id: photoId }),
      );
    },
    onMutate: async ({ photoId, liked }) => {
      await qc.cancelQueries({ queryKey: keys.photoSocial(mid) });
      const previous = qc.getQueriesData<PhotoSocial>({ queryKey: keys.photoSocial(mid) });
      qc.setQueriesData<PhotoSocial>({ queryKey: keys.photoSocial(mid) }, (data) =>
        data
          ? {
              ...data,
              likes: liked
                ? data.likes.filter((l) => !(l.photo_id === photoId && l.user_id === uid))
                : [...data.likes, { photo_id: photoId, user_id: uid }],
            }
          : data,
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      context?.previous.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.photoSocial(mid) }),
  });
}

export function useAddPhotoComment(mid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ photoId, body }: { photoId: string; body: string }) => {
      unwrap(await supabase.from('memory_photo_comments').insert({ photo_id: photoId, body: body.trim() }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.photoSocial(mid) }),
  });
}

export function useDeletePhotoComment(mid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('memory_photo_comments').delete().eq('id', id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.photoSocial(mid) }),
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
