-- 1. Miniatures des photos (générées par l'app à l'envoi), utilisées par les listes et les murs.
-- 2. Suppression de compte par l'utilisateur lui-même.
-- 3. Suppression de l'ancienne table friend_notes (reprise dans friend_private_notes).

-- ---------------------------------------------------------------------------
-- 1. Miniatures : même dossier que la photo (<memory_id>/…), donc mêmes droits de stockage.
-- Les photos envoyées avant cette migration n'en ont pas : l'app retombe alors sur la photo entière.
-- ---------------------------------------------------------------------------

alter table public.memory_photos
  add column thumb_path text unique check (thumb_path is null or split_part(thumb_path, '/', 1) = memory_id::text);

-- Mêmes colonnes qu'avant (pas de changement de signature) : la couverture et les premières photos
-- renvoient la miniature quand elle existe. Les écrans de liste chargent ainsi des images légères.
create or replace function public.get_memories(p_group_id uuid default null, p_friend_id uuid default null)
returns table (id uuid, author_id uuid, group_id uuid, kind text, title text, body text, place text,
               happened_on date, ends_on date, created_at timestamptz,
               cover_path text, photo_count bigint, people uuid[], photo_paths text[], stops jsonb)
language sql security definer stable set search_path = public as $$
  select m.id, m.author_id, m.group_id, m.kind, m.title, m.body, m.place,
         m.happened_on, m.ends_on, m.created_at,
         (select coalesce(ph.thumb_path, ph.path) from memory_photos ph where ph.memory_id = m.id order by ph.created_at limit 1),
         (select count(*) from memory_photos ph where ph.memory_id = m.id),
         coalesce((select array_agg(p.user_id) from memory_people p where p.memory_id = m.id), '{}'),
         coalesce((select array_agg(x.path) from (
           select coalesce(ph.thumb_path, ph.path) as path from memory_photos ph where ph.memory_id = m.id order by ph.created_at limit 3
         ) x), '{}'),
         coalesce((select jsonb_agg(jsonb_build_object('name', s.name, 'country_code', s.country_code, 'lat', s.lat, 'lng', s.lng)
                                    order by s.position)
                   from memory_stops s where s.memory_id = m.id), '[]')
  from memories m
  where can_see_memory(m.id)
    and (p_group_id is null or m.group_id = p_group_id)
    and (
      p_friend_id is null
      or m.author_id = p_friend_id
      or exists (select 1 from memory_people p where p.memory_id = m.id and p.user_id = p_friend_id)
    )
  -- id en dernier critère : ordre stable, nécessaire pour paginer (limit/offset côté PostgREST).
  order by coalesce(m.happened_on, m.created_at::date) desc, m.created_at desc, m.id;
$$;

-- ---------------------------------------------------------------------------
-- 2. Suppression de compte. Les fichiers du stockage (avatar, photos) sont retirés par l'app avant
-- l'appel, via l'API storage. Ici : on quitte chaque groupe proprement (passation du rôle d'admin,
-- groupe vide supprimé), puis on supprime l'utilisateur ; tout le reste suit par cascade
-- (profil, souvenirs écrits, photos ajoutées, commentaires, likes, notes, adresse, partages).
-- ---------------------------------------------------------------------------

create function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  gid uuid;
begin
  if me is null then raise exception 'Non connecté'; end if;
  for gid in select group_id from group_members where user_id = me loop
    perform leave_group(gid);
  end loop;
  delete from auth.users where id = me;
end; $$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Ancienne table des notes privées (deux champs fixes), remplacée par friend_private_notes.
-- ---------------------------------------------------------------------------

drop table public.friend_notes;
