-- Commentaires sur les souvenirs et voyages.
-- Même audience que le souvenir (can_see_memory) : toute personne qui le voit peut commenter.
-- Suppression : l'auteur du commentaire, ou l'auteur du souvenir (modération de sa page).
-- Pas de modification : on supprime et on réécrit.

create table public.memory_comments (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index memory_comments_memory_id_idx on public.memory_comments (memory_id, created_at);
create index memory_comments_author_id_idx on public.memory_comments (author_id);

alter table public.memory_comments enable row level security;

create policy "memory_comments_select" on public.memory_comments for select to authenticated
  using (public.can_see_memory(memory_id));
create policy "memory_comments_insert" on public.memory_comments for insert to authenticated
  with check (author_id = auth.uid() and public.can_see_memory(memory_id));
create policy "memory_comments_delete" on public.memory_comments for delete to authenticated
  using (
    author_id = auth.uid()
    or exists (select 1 from public.memories m where m.id = memory_id and m.author_id = auth.uid())
  );

revoke all on public.memory_comments from anon;
revoke update on public.memory_comments from authenticated;
