-- Pinpals : schéma initial, RLS, RPC et stockage des avatars.
-- Règle de confidentialité : on stocke une ville, jamais une position GPS exacte.
-- lat/lng ne sont écrits que par set_my_location(), qui applique le jitter côté serveur.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  avatar_url text,
  pin_color text not null default '#FFB5C2' check (pin_color ~ '^#[0-9A-Fa-f]{6}$'),
  pin_emoji text,
  bio text check (char_length(bio) <= 280),
  job_title text,
  company text,
  socials jsonb not null default '{}',
  city text,
  country text,
  country_code text,
  lat double precision,
  lng double precision,
  location_updated_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  emoji text not null default '🎓',
  color text not null default '#B5D8FF' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  invite_code text unique not null default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_members_user_id_idx on public.group_members (user_id);

-- ---------------------------------------------------------------------------
-- Helpers (security definer pour éviter la récursion RLS sur group_members)
-- ---------------------------------------------------------------------------

create function public.is_group_member(gid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

create function public.is_group_admin(gid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid() and role = 'admin'
  );
$$;

create function public.shares_group_with(other uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from group_members a
    join group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- profiles : je lis le mien ou celui de quelqu'un avec qui je partage un groupe.
create policy "profiles_select" on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_group_with(id));
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- La position ne s'écrit que via set_my_location() : pas de grant sur ces colonnes.
revoke insert, update on public.profiles from anon, authenticated;
grant insert (id, display_name, avatar_url, pin_color, pin_emoji, bio, job_title, company, socials)
  on public.profiles to authenticated;
-- `id` est inclus car l'upsert PostgREST le réécrit dans le SET ; la policy empêche de le changer.
grant update (id, display_name, avatar_url, pin_color, pin_emoji, bio, job_title, company, socials)
  on public.profiles to authenticated;

-- groups : lecture si membre, modification/suppression si admin. Création via create_group().
create policy "groups_select_member" on public.groups for select to authenticated
  using (public.is_group_member(id));
create policy "groups_update_admin" on public.groups for update to authenticated
  using (public.is_group_admin(id)) with check (public.is_group_admin(id));
create policy "groups_delete_admin" on public.groups for delete to authenticated
  using (public.is_group_admin(id));

revoke insert, update on public.groups from anon, authenticated;
grant update (name, emoji, color) on public.groups to authenticated;

-- group_members : lecture des membres de mes groupes. Écritures uniquement via RPC.
create policy "group_members_select" on public.group_members for select to authenticated
  using (public.is_group_member(group_id));

revoke insert, update, delete on public.group_members from anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC
-- ---------------------------------------------------------------------------

-- Enregistre ma ville. Les coordonnées reçues sont celles du centre de la ville ;
-- on ajoute un jitter d'environ ±1 km pour ne pas empiler tout le monde au même point.
create function public.set_my_location(
  p_city text, p_country text, p_country_code text, p_lat double precision, p_lng double precision
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Coordonnées invalides';
  end if;

  update profiles set
    city = p_city,
    country = p_country,
    country_code = upper(p_country_code),
    lat = p_lat + (random() - 0.5) * 0.02,
    lng = p_lng + (random() - 0.5) * 0.02 / greatest(cos(radians(p_lat)), 0.2),
    location_updated_at = now()
  where id = auth.uid();

  if not found then raise exception 'Profil introuvable'; end if;
end; $$;

create function public.create_group(p_name text, p_emoji text default '🎓', p_color text default '#B5D8FF')
returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  insert into groups (name, emoji, color, created_by)
  values (p_name, coalesce(p_emoji, '🎓'), coalesce(p_color, '#B5D8FF'), auth.uid())
  returning id into gid;

  insert into group_members (group_id, user_id, role) values (gid, auth.uid(), 'admin');
  return gid;
end; $$;

create function public.join_group(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  select id into gid from groups where invite_code = upper(trim(code));
  if gid is null then raise exception 'Code invalide'; end if;

  insert into group_members (group_id, user_id)
  values (gid, auth.uid()) on conflict do nothing;
  return gid;
end; $$;

-- Aperçu d'un groupe avant de le rejoindre (écran d'invitation, accessible sans compte).
create function public.get_group_preview(code text)
returns table (id uuid, name text, emoji text, color text, member_count bigint)
language sql security definer stable set search_path = public as $$
  select g.id, g.name, g.emoji, g.color,
         (select count(*) from group_members m where m.group_id = g.id)
  from groups g
  where g.invite_code = upper(trim(code));
$$;

-- Quitter un groupe. Si j'étais le dernier admin, le membre le plus ancien est promu ;
-- si j'étais le dernier membre, le groupe est supprimé.
create function public.leave_group(gid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from group_members where group_id = gid and user_id = auth.uid();

  if not exists (select 1 from group_members where group_id = gid) then
    delete from groups where id = gid;
  elsif not exists (select 1 from group_members where group_id = gid and role = 'admin') then
    update group_members set role = 'admin'
    where group_id = gid
      and user_id = (select user_id from group_members where group_id = gid order by joined_at limit 1);
  end if;
end; $$;

create function public.remove_member(gid uuid, uid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_group_admin(gid) then raise exception 'Réservé aux admins'; end if;
  if uid = auth.uid() then raise exception 'Utilise leave_group pour te retirer'; end if;
  delete from group_members where group_id = gid and user_id = uid;
end; $$;

create function public.regenerate_invite_code(gid uuid)
returns text language plpgsql security definer set search_path = public as $$
declare new_code text;
begin
  if not is_group_admin(gid) then raise exception 'Réservé aux admins'; end if;
  update groups set invite_code = upper(substr(md5(gen_random_uuid()::text), 1, 8))
  where id = gid returning invite_code into new_code;
  return new_code;
end; $$;

-- Mes groupes avec le nombre de membres et mon rôle (écran d'accueil).
create function public.get_my_groups()
returns table (id uuid, name text, emoji text, color text, invite_code text,
               role text, member_count bigint, created_at timestamptz)
language sql security definer stable set search_path = public as $$
  select g.id, g.name, g.emoji, g.color, g.invite_code, me.role,
         (select count(*) from group_members m where m.group_id = g.id),
         g.created_at
  from group_members me
  join groups g on g.id = me.group_id
  where me.user_id = auth.uid()
  order by me.joined_at desc;
$$;

-- La carte d'un groupe en une seule requête : tout ce qu'il faut pour les pins et les cards.
create function public.get_group_map(gid uuid)
returns table (id uuid, display_name text, avatar_url text, pin_color text, pin_emoji text,
               bio text, job_title text, company text, socials jsonb,
               city text, country text, country_code text,
               lat double precision, lng double precision, location_updated_at timestamptz,
               role text)
language sql security definer stable set search_path = public as $$
  select p.id, p.display_name, p.avatar_url, p.pin_color, p.pin_emoji,
         p.bio, p.job_title, p.company, p.socials,
         p.city, p.country, p.country_code,
         p.lat, p.lng, p.location_updated_at,
         m.role
  from profiles p
  join group_members m on m.user_id = p.id
  where m.group_id = gid and public.is_group_member(gid) and p.lat is not null
  order by p.display_name;
$$;

-- Self-hosted : les fonctions sont exécutables par PUBLIC par défaut, on resserre.
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.is_group_member(uuid),
  public.is_group_admin(uuid),
  public.shares_group_with(uuid),
  public.set_my_location(text, text, text, double precision, double precision),
  public.create_group(text, text, text),
  public.join_group(text),
  public.get_group_preview(text),
  public.leave_group(uuid),
  public.remove_member(uuid, uuid),
  public.regenerate_invite_code(uuid),
  public.get_my_groups(),
  public.get_group_map(uuid)
to authenticated;
grant execute on function public.get_group_preview(text) to anon;

-- ---------------------------------------------------------------------------
-- Storage : bucket avatars, "je n'écris que dans mon dossier" (avatars/<uid>/...)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars_insert_own_folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_update_own_folder" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_delete_own_folder" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
