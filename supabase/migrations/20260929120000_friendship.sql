-- Pinpals : fiche ami·e, adresse privée, notes privées, souvenirs (scrapbook) et voyages.
-- L'adresse postale n'est jamais liée à la carte : table séparée, visible seulement
-- par les personnes choisies (address_shares) avec qui on partage encore un groupe.

-- ---------------------------------------------------------------------------
-- Fiche : remplie par chacun sur son profil, visible par les membres de ses groupes
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column birthday_day smallint check (birthday_day between 1 and 31),
  add column birthday_month smallint check (birthday_month between 1 and 12),
  add column birth_year smallint check (birth_year between 1900 and 2100),
  add column favorites jsonb not null default '{}',
  add column wishlist text check (char_length(wishlist) <= 500),
  add constraint profiles_birthday_complete check ((birthday_day is null) = (birthday_month is null));

grant insert (birthday_day, birthday_month, birth_year, favorites, wishlist) on public.profiles to authenticated;
grant update (birthday_day, birthday_month, birth_year, favorites, wishlist) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Adresse postale (privée) et partages
-- ---------------------------------------------------------------------------

create table public.addresses (
  user_id uuid primary key default auth.uid() references public.profiles(id) on delete cascade,
  line1 text not null check (char_length(line1) between 1 and 200),
  line2 text check (char_length(line2) <= 200),
  postal_code text check (char_length(postal_code) <= 20),
  city text not null check (char_length(city) between 1 and 100),
  country text check (char_length(country) <= 100),
  updated_at timestamptz not null default now()
);

create table public.address_shares (
  owner_id uuid default auth.uid() references public.profiles(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, viewer_id),
  check (owner_id <> viewer_id)
);

create index address_shares_viewer_id_idx on public.address_shares (viewer_id);

alter table public.addresses enable row level security;
alter table public.address_shares enable row level security;

-- Je vois mon adresse, ou celle de quelqu'un qui me l'a partagée ET avec qui je partage encore un groupe.
create policy "addresses_select" on public.addresses for select to authenticated
  using (
    user_id = auth.uid()
    or (
      public.shares_group_with(user_id)
      and exists (select 1 from public.address_shares s where s.owner_id = addresses.user_id and s.viewer_id = auth.uid())
    )
  );
create policy "addresses_insert_own" on public.addresses for insert to authenticated
  with check (user_id = auth.uid());
create policy "addresses_update_own" on public.addresses for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "addresses_delete_own" on public.addresses for delete to authenticated
  using (user_id = auth.uid());

-- Partages : je vois ceux que j'ai faits et ceux qu'on m'a faits ; je ne partage qu'avec un membre de mes groupes.
create policy "address_shares_select" on public.address_shares for select to authenticated
  using (owner_id = auth.uid() or viewer_id = auth.uid());
create policy "address_shares_insert_own" on public.address_shares for insert to authenticated
  with check (owner_id = auth.uid() and public.shares_group_with(viewer_id));
create policy "address_shares_delete_own" on public.address_shares for delete to authenticated
  using (owner_id = auth.uid());

revoke all on public.addresses, public.address_shares from anon;
revoke update on public.address_shares from authenticated;

-- ---------------------------------------------------------------------------
-- Notes privées sur un·e ami·e (idées cadeaux…) : visibles uniquement par leur auteur
-- ---------------------------------------------------------------------------

create table public.friend_notes (
  author_id uuid default auth.uid() references public.profiles(id) on delete cascade,
  friend_id uuid references public.profiles(id) on delete cascade,
  gift_ideas text check (char_length(gift_ideas) <= 2000),
  notes text check (char_length(notes) <= 2000),
  updated_at timestamptz not null default now(),
  primary key (author_id, friend_id),
  check (author_id <> friend_id)
);

alter table public.friend_notes enable row level security;

create policy "friend_notes_select_own" on public.friend_notes for select to authenticated
  using (author_id = auth.uid());
create policy "friend_notes_insert_own" on public.friend_notes for insert to authenticated
  with check (author_id = auth.uid() and public.shares_group_with(friend_id));
create policy "friend_notes_update_own" on public.friend_notes for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid() and public.shares_group_with(friend_id));
create policy "friend_notes_delete_own" on public.friend_notes for delete to authenticated
  using (author_id = auth.uid());

revoke all on public.friend_notes from anon;

-- ---------------------------------------------------------------------------
-- Souvenirs et voyages
-- Audience : un groupe (group_id) et/ou des personnes choisies (memory_people).
-- memory_people sert aussi à dire « qui était là » dans un souvenir de groupe.
-- ---------------------------------------------------------------------------

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  kind text not null default 'memory' check (kind in ('memory', 'trip')),
  title text not null check (char_length(title) between 1 and 100),
  body text check (char_length(body) <= 5000),
  place text check (char_length(place) <= 100),
  happened_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  check (ends_on is null or happened_on is null or ends_on >= happened_on)
);

create index memories_group_id_idx on public.memories (group_id);
create index memories_author_id_idx on public.memories (author_id);

create table public.memory_people (
  memory_id uuid references public.memories(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (memory_id, user_id)
);

create index memory_people_user_id_idx on public.memory_people (user_id);

-- Chemin dans le bucket : <memory_id>/<fichier>.
create table public.memory_photos (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  path text not null unique,
  uploaded_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (split_part(path, '/', 1) = memory_id::text)
);

create index memory_photos_memory_id_idx on public.memory_photos (memory_id);

create function public.can_see_memory(mid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from memories m
    where m.id = mid and (
      m.author_id = auth.uid()
      or (m.group_id is not null and is_group_member(m.group_id))
      or exists (select 1 from memory_people p where p.memory_id = m.id and p.user_id = auth.uid())
    )
  );
$$;

-- Même règle, à partir d'un chemin de fichier du bucket (premier dossier = id du souvenir).
create function public.can_see_memory_path(object_name text)
returns boolean language sql security definer stable set search_path = public as $$
  select case
    when split_part(object_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then can_see_memory(split_part(object_name, '/', 1)::uuid)
    else false
  end;
$$;

-- Supprimer une photo : celui qui l'a ajoutée ou l'auteur du souvenir.
create function public.can_delete_memory_photo(object_name text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from memory_photos ph
    join memories m on m.id = ph.memory_id
    where ph.path = object_name and (ph.uploaded_by = auth.uid() or m.author_id = auth.uid())
  );
$$;

alter table public.memories enable row level security;
alter table public.memory_people enable row level security;
alter table public.memory_photos enable row level security;

-- memories : lecture si je fais partie de l'audience. Création via create_memory().
create policy "memories_select" on public.memories for select to authenticated
  using (public.can_see_memory(id));
create policy "memories_update_author" on public.memories for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "memories_delete" on public.memories for delete to authenticated
  using (author_id = auth.uid() or (group_id is not null and public.is_group_admin(group_id)));

revoke all on public.memories from anon;
revoke insert, update on public.memories from authenticated;
grant update (kind, title, body, place, happened_on, ends_on) on public.memories to authenticated;

-- memory_people : lecture par l'audience. Écritures via create_memory() / set_memory_people().
create policy "memory_people_select" on public.memory_people for select to authenticated
  using (public.can_see_memory(memory_id));

revoke all on public.memory_people from anon;
revoke insert, update, delete on public.memory_people from authenticated;

-- memory_photos : toute l'audience peut ajouter des photos (scrapbook partagé).
create policy "memory_photos_select" on public.memory_photos for select to authenticated
  using (public.can_see_memory(memory_id));
create policy "memory_photos_insert" on public.memory_photos for insert to authenticated
  with check (uploaded_by = auth.uid() and public.can_see_memory(memory_id));
create policy "memory_photos_delete" on public.memory_photos for delete to authenticated
  using (public.can_delete_memory_photo(path));

revoke all on public.memory_photos from anon;
revoke update on public.memory_photos from authenticated;

-- Vérifie que chaque personne peut faire partie de l'audience : membre du groupe si le
-- souvenir est lié à un groupe, sinon quelqu'un avec qui je partage un groupe.
create function public.check_memory_people(p_group_id uuid, p_people uuid[])
returns void language plpgsql security definer stable set search_path = public as $$
declare person uuid;
begin
  foreach person in array coalesce(p_people, '{}') loop
    if person = auth.uid() then continue; end if;
    if p_group_id is not null then
      if not exists (select 1 from group_members where group_id = p_group_id and user_id = person) then
        raise exception 'Personne hors du groupe';
      end if;
    elsif not shares_group_with(person) then
      raise exception 'Personne inconnue';
    end if;
  end loop;
end; $$;

create function public.create_memory(
  p_title text,
  p_kind text default 'memory',
  p_body text default null,
  p_place text default null,
  p_happened_on date default null,
  p_ends_on date default null,
  p_group_id uuid default null,
  p_people uuid[] default '{}'
)
returns uuid language plpgsql security definer set search_path = public as $$
declare mid uuid;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  if p_group_id is not null and not is_group_member(p_group_id) then
    raise exception 'Réservé aux membres du groupe';
  end if;
  if p_group_id is null and not exists (select 1 from unnest(coalesce(p_people, '{}')) u where u <> auth.uid()) then
    raise exception 'Choisis un groupe ou au moins un·e ami·e';
  end if;
  perform check_memory_people(p_group_id, p_people);

  insert into memories (author_id, group_id, kind, title, body, place, happened_on, ends_on)
  values (auth.uid(), p_group_id, coalesce(p_kind, 'memory'), p_title, p_body, p_place, p_happened_on, p_ends_on)
  returning id into mid;

  insert into memory_people (memory_id, user_id)
  select distinct mid, u from unnest(coalesce(p_people, '{}')) u where u <> auth.uid();
  return mid;
end; $$;

create function public.set_memory_people(mid uuid, p_people uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  select group_id into gid from memories where id = mid and author_id = auth.uid();
  if not found then raise exception 'Réservé à l''auteur'; end if;
  if gid is null and not exists (select 1 from unnest(coalesce(p_people, '{}')) u where u <> auth.uid()) then
    raise exception 'Choisis un groupe ou au moins un·e ami·e';
  end if;
  perform check_memory_people(gid, p_people);

  delete from memory_people where memory_id = mid;
  insert into memory_people (memory_id, user_id)
  select distinct mid, u from unnest(coalesce(p_people, '{}')) u where u <> auth.uid();
end; $$;

-- Le scrapbook : les souvenirs que je peux voir, filtrés par groupe ou par ami·e,
-- avec la première photo (couverture), le nombre de photos et les personnes taguées.
create function public.get_memories(p_group_id uuid default null, p_friend_id uuid default null)
returns table (id uuid, author_id uuid, group_id uuid, kind text, title text, body text, place text,
               happened_on date, ends_on date, created_at timestamptz,
               cover_path text, photo_count bigint, people uuid[])
language sql security definer stable set search_path = public as $$
  select m.id, m.author_id, m.group_id, m.kind, m.title, m.body, m.place,
         m.happened_on, m.ends_on, m.created_at,
         (select ph.path from memory_photos ph where ph.memory_id = m.id order by ph.created_at limit 1),
         (select count(*) from memory_photos ph where ph.memory_id = m.id),
         coalesce((select array_agg(p.user_id) from memory_people p where p.memory_id = m.id), '{}')
  from memories m
  where can_see_memory(m.id)
    and (p_group_id is null or m.group_id = p_group_id)
    and (
      p_friend_id is null
      or m.author_id = p_friend_id
      or exists (select 1 from memory_people p where p.memory_id = m.id and p.user_id = p_friend_id)
    )
  order by coalesce(m.happened_on, m.created_at::date) desc, m.created_at desc;
$$;

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.can_see_memory(uuid),
  public.can_see_memory_path(text),
  public.can_delete_memory_photo(text),
  public.check_memory_people(uuid, uuid[]),
  public.create_memory(text, text, text, text, date, date, uuid, uuid[]),
  public.set_memory_people(uuid, uuid[]),
  public.get_memories(uuid, uuid)
to authenticated;
-- Le revoke global ci-dessus s'applique aussi aux fonctions de la migration initiale :
-- on rend à anon l'aperçu d'invitation.
grant execute on function public.get_group_preview(text) to anon;

-- ---------------------------------------------------------------------------
-- Storage : bucket privé « memories », accès calqué sur l'audience du souvenir
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memories', 'memories', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "memories_read_audience" on storage.objects for select to authenticated
  using (bucket_id = 'memories' and public.can_see_memory_path(name));
create policy "memories_insert_audience" on storage.objects for insert to authenticated
  with check (bucket_id = 'memories' and public.can_see_memory_path(name));
create policy "memories_delete_uploader_or_author" on storage.objects for delete to authenticated
  using (bucket_id = 'memories' and public.can_delete_memory_photo(name));
