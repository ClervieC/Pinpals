import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { decode } from 'base64-arraybuffer';

import { useUserId } from './auth';
import { supabase } from './supabase';
import type { City, GroupMember, GroupPreview, MapMember, MyGroup, Profile, ProfileInput } from './types';

export const keys = {
  profile: (uid: string) => ['profile', uid] as const,
  myGroups: ['my-groups'] as const,
  groupMap: (gid: string) => ['group-map', gid] as const,
  groupMembers: (gid: string) => ['group-members', gid] as const,
  preview: (code: string) => ['group-preview', code] as const,
};

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
