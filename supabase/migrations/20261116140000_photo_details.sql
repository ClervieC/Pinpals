-- Photos des souvenirs : date et légende, likes et commentaires par photo.
-- Toute l'audience du souvenir (can_see_memory) voit, like et commente — comme elle peut déjà ajouter des photos.

-- ---------------------------------------------------------------------------
-- Date et légende d'une photo : modifiables par la personne qui l'a ajoutée ou par l'auteur du souvenir.
-- ---------------------------------------------------------------------------

alter table public.memory_photos
  add column taken_on date,
  add column caption text check (char_length(caption) <= 500);

create policy "memory_photos_update" on public.memory_photos for update to authenticated
  using (public.can_delete_memory_photo(path)) with check (public.can_delete_memory_photo(path));

-- Seules la date et la légende se modifient (ni le fichier, ni le souvenir, ni l'auteur).
grant update (taken_on, caption) on public.memory_photos to authenticated;

-- Audience d'une photo = audience de son souvenir.
create function public.can_see_memory_photo(pid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from memory_photos ph where ph.id = pid and can_see_memory(ph.memory_id));
$$;

revoke execute on function public.can_see_memory_photo(uuid) from public, anon;
grant execute on function public.can_see_memory_photo(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Likes : un par personne et par photo.
-- ---------------------------------------------------------------------------

create table public.memory_photo_likes (
  photo_id uuid not null references public.memory_photos(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);

create index memory_photo_likes_user_id_idx on public.memory_photo_likes (user_id);

alter table public.memory_photo_likes enable row level security;

create policy "memory_photo_likes_select" on public.memory_photo_likes for select to authenticated
  using (public.can_see_memory_photo(photo_id));
create policy "memory_photo_likes_insert" on public.memory_photo_likes for insert to authenticated
  with check (user_id = auth.uid() and public.can_see_memory_photo(photo_id));
create policy "memory_photo_likes_delete" on public.memory_photo_likes for delete to authenticated
  using (user_id = auth.uid());

revoke all on public.memory_photo_likes from anon;
revoke update on public.memory_photo_likes from authenticated;

-- ---------------------------------------------------------------------------
-- Commentaires sous une photo : l'auteur du commentaire ou du souvenir peut le supprimer.
-- ---------------------------------------------------------------------------

create table public.memory_photo_comments (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.memory_photos(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index memory_photo_comments_photo_id_idx on public.memory_photo_comments (photo_id, created_at);
create index memory_photo_comments_author_id_idx on public.memory_photo_comments (author_id);

alter table public.memory_photo_comments enable row level security;

create policy "memory_photo_comments_select" on public.memory_photo_comments for select to authenticated
  using (public.can_see_memory_photo(photo_id));
create policy "memory_photo_comments_insert" on public.memory_photo_comments for insert to authenticated
  with check (author_id = auth.uid() and public.can_see_memory_photo(photo_id));
create policy "memory_photo_comments_delete" on public.memory_photo_comments for delete to authenticated
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.memory_photos ph join public.memories m on m.id = ph.memory_id
      where ph.id = photo_id and m.author_id = auth.uid()
    )
  );

revoke all on public.memory_photo_comments from anon;
revoke update on public.memory_photo_comments from authenticated;
