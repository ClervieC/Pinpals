-- Notifications dans l'app (pas de push) : remplies par des triggers, lues à l'ouverture de l'app.
-- Les rappels d'anniversaire ne sont pas stockés : l'app les calcule à partir des profils.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in (
    'memory_comment', -- commentaire sur mon souvenir
    'photo_comment',  -- commentaire sur ma photo (ou une photo de mon souvenir)
    'photo_like',     -- like sur ma photo
    'tagged',         -- on m'a ajouté·e à un souvenir
    'group_memory',   -- nouveau souvenir dans un de mes groupes
    'member_joined',  -- quelqu'un a rejoint un de mes groupes
    'moved'           -- un·e ami·e a changé de ville
  )),
  group_id uuid references public.groups(id) on delete cascade,
  memory_id uuid references public.memories(id) on delete cascade,
  photo_id uuid references public.memory_photos(id) on delete cascade,
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (user_id <> actor_id)
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_actor_idx on public.notifications (actor_id);
create index notifications_memory_idx on public.notifications (memory_id);
create index notifications_photo_idx on public.notifications (photo_id);
create index notifications_group_idx on public.notifications (group_id);

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
create policy "notifications_select_own" on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy "notifications_delete_own" on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- Ajout interne (appelé par les triggers) : jamais à soi-même.
create function public.notify(p_user uuid, p_actor uuid, p_kind text, p_group uuid default null,
                              p_memory uuid default null, p_photo uuid default null, p_data jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, actor_id, kind, group_id, memory_id, photo_id, data)
  select p_user, p_actor, p_kind, p_group, p_memory, p_photo, coalesce(p_data, '{}')
  where p_user is not null and p_actor is not null and p_user <> p_actor;
$$;

-- Commentaire sur un souvenir → son auteur.
create function public.notify_memory_comment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform notify(m.author_id, new.author_id, 'memory_comment', m.group_id, m.id)
  from memories m where m.id = new.memory_id;
  return new;
end; $$;
create trigger memory_comments_notify after insert on public.memory_comments
for each row execute function public.notify_memory_comment();

-- Commentaire sur une photo → la personne qui l'a ajoutée, et l'auteur du souvenir s'il est différent.
create function public.notify_photo_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare ph record;
begin
  select p.id, p.uploaded_by, m.id as memory_id, m.author_id, m.group_id into ph
  from memory_photos p join memories m on m.id = p.memory_id where p.id = new.photo_id;
  perform notify(ph.uploaded_by, new.author_id, 'photo_comment', ph.group_id, ph.memory_id, ph.id);
  if ph.author_id is distinct from ph.uploaded_by then
    perform notify(ph.author_id, new.author_id, 'photo_comment', ph.group_id, ph.memory_id, ph.id);
  end if;
  return new;
end; $$;
create trigger memory_photo_comments_notify after insert on public.memory_photo_comments
for each row execute function public.notify_photo_comment();

-- Like → la personne qui a ajouté la photo ; retirer le like retire la notification.
create function public.notify_photo_like() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    delete from notifications where kind = 'photo_like' and photo_id = old.photo_id and actor_id = old.user_id;
    return old;
  end if;
  perform notify(p.uploaded_by, new.user_id, 'photo_like', m.group_id, m.id, p.id)
  from memory_photos p join memories m on m.id = p.memory_id where p.id = new.photo_id;
  return new;
end; $$;
create trigger memory_photo_likes_notify after insert or delete on public.memory_photo_likes
for each row execute function public.notify_photo_like();

-- Nouveau souvenir de groupe → les autres membres.
create function public.notify_group_memory() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.group_id is not null then
    perform notify(gm.user_id, new.author_id, 'group_memory', new.group_id, new.id)
    from group_members gm where gm.group_id = new.group_id;
  end if;
  return new;
end; $$;
create trigger memories_notify after insert on public.memories
for each row execute function public.notify_group_memory();

-- Ajouté·e à un souvenir → une seule fois par souvenir (set_memory_people réécrit la liste),
-- et elle remplace l'éventuelle notification « nouveau souvenir dans le groupe ».
create function public.notify_tagged() returns trigger
language plpgsql security definer set search_path = public as $$
declare m record;
begin
  select id, author_id, group_id into m from memories where id = new.memory_id;
  if exists (select 1 from notifications where user_id = new.user_id and kind = 'tagged' and memory_id = m.id) then
    return new;
  end if;
  delete from notifications where user_id = new.user_id and kind = 'group_memory' and memory_id = m.id;
  perform notify(new.user_id, m.author_id, 'tagged', m.group_id, m.id);
  return new;
end; $$;
create trigger memory_people_notify after insert on public.memory_people
for each row execute function public.notify_tagged();

-- Quelqu'un rejoint un groupe → les autres membres.
create function public.notify_member_joined() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform notify(gm.user_id, new.user_id, 'member_joined', new.group_id)
  from group_members gm where gm.group_id = new.group_id and gm.user_id <> new.user_id;
  return new;
end; $$;
create trigger group_members_notify after insert on public.group_members
for each row execute function public.notify_member_joined();

-- Déménagement (pas la première ville, posée à l'inscription) → les personnes qui partagent un groupe.
create function public.notify_moved() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.city is not null and new.city is distinct from old.city then
    perform notify(other.user_id, new.id, 'moved', null, null, null,
                   jsonb_build_object('city', new.city, 'country_code', new.country_code))
    from (
      select distinct b.user_id from group_members a
      join group_members b on b.group_id = a.group_id
      where a.user_id = new.id and b.user_id <> new.id
    ) other;
  end if;
  return new;
end; $$;
create trigger profiles_notify_moved after update of city on public.profiles
for each row execute function public.notify_moved();

-- Mes notifications, les plus récentes d'abord (paginer avec .range()). Une notification dont
-- je ne peux plus voir le sujet (groupe quitté, souvenir retiré) n'est pas renvoyée.
create function public.get_my_notifications()
returns table (id uuid, kind text, created_at timestamptz, read_at timestamptz, data jsonb,
               actor_id uuid, actor_name text, actor_avatar_url text, actor_color text,
               group_id uuid, group_name text, group_emoji text,
               memory_id uuid, memory_title text, memory_kind text, photo_id uuid)
language sql security definer stable set search_path = public as $$
  select n.id, n.kind, n.created_at, n.read_at, n.data,
         a.id, a.display_name, a.avatar_url, a.pin_color,
         g.id, g.name, g.emoji,
         m.id, m.title, m.kind, n.photo_id
  from notifications n
  join profiles a on a.id = n.actor_id
  left join groups g on g.id = n.group_id
  left join memories m on m.id = n.memory_id
  where n.user_id = auth.uid()
    and (n.memory_id is null or public.can_see_memory(n.memory_id))
    and (n.kind not in ('group_memory', 'member_joined') or public.is_group_member(n.group_id))
    and (n.kind <> 'moved' or public.shares_group_with(n.actor_id))
  order by n.created_at desc, n.id;
$$;

create function public.count_unread_notifications()
returns bigint language sql security definer stable set search_path = public as $$
  select count(*) from public.get_my_notifications() where read_at is null;
$$;

-- Tout marquer comme lu (à l'ouverture de l'écran) et oublier ce qui a plus de 90 jours.
create function public.mark_notifications_read()
returns void language plpgsql security definer set search_path = public as $$
begin
  update notifications set read_at = now() where user_id = auth.uid() and read_at is null;
  delete from notifications where user_id = auth.uid() and created_at < now() - interval '90 days';
end; $$;

revoke execute on function
  public.notify(uuid, uuid, text, uuid, uuid, uuid, jsonb),
  public.notify_memory_comment(),
  public.notify_photo_comment(),
  public.notify_photo_like(),
  public.notify_group_memory(),
  public.notify_tagged(),
  public.notify_member_joined(),
  public.notify_moved(),
  public.get_my_notifications(),
  public.count_unread_notifications(),
  public.mark_notifications_read()
from public, anon, authenticated;
grant execute on function
  public.get_my_notifications(),
  public.count_unread_notifications(),
  public.mark_notifications_read()
to authenticated;
