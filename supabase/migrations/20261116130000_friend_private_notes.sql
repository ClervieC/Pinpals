-- Notes privées multiples sur un·e ami·e : autant qu'on veut, chacune avec un type.
-- Remplace les deux champs fixes de friend_notes (gift_ideas, notes), dont le contenu est recopié ici.
-- friend_notes est conservée (plus utilisée par l'app) : à supprimer une fois la migration vérifiée.
-- Visibles uniquement par leur auteur ; « address » est une adresse notée pour soi, sans lien avec
-- l'adresse que l'ami·e partage elle-même (table addresses).

create table public.friend_private_notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'note' check (kind in ('note', 'gift', 'address')),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (author_id <> friend_id)
);

create index friend_private_notes_author_friend_idx on public.friend_private_notes (author_id, friend_id, created_at);
create index friend_private_notes_friend_id_idx on public.friend_private_notes (friend_id);

-- Reprise des anciennes notes.
insert into public.friend_private_notes (author_id, friend_id, kind, body, created_at, updated_at)
select author_id, friend_id, 'gift', btrim(gift_ideas), updated_at, updated_at
from public.friend_notes where btrim(coalesce(gift_ideas, '')) <> '';
insert into public.friend_private_notes (author_id, friend_id, kind, body, created_at, updated_at)
select author_id, friend_id, 'note', btrim(notes), updated_at, updated_at
from public.friend_notes where btrim(coalesce(notes, '')) <> '';

alter table public.friend_private_notes enable row level security;

create policy "friend_private_notes_select_own" on public.friend_private_notes for select to authenticated
  using (author_id = auth.uid());
create policy "friend_private_notes_insert_own" on public.friend_private_notes for insert to authenticated
  with check (author_id = auth.uid() and public.shares_group_with(friend_id));
create policy "friend_private_notes_update_own" on public.friend_private_notes for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "friend_private_notes_delete_own" on public.friend_private_notes for delete to authenticated
  using (author_id = auth.uid());

revoke all on public.friend_private_notes from anon;
-- Seuls le type et le texte se modifient ; l'auteur et l'ami·e sont fixés à la création.
revoke update on public.friend_private_notes from authenticated;
grant update (kind, body, updated_at) on public.friend_private_notes to authenticated;
