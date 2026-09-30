-- Pinpals : étapes des souvenirs (où ça s'est passé), pour les afficher sur la carte du groupe.
-- Un souvenir a au plus une étape ; un voyage en a plusieurs, dans l'ordre du trajet.
-- Coordonnées = centre de la ville (Photon), jamais une adresse : même logique que les profils.

create table public.memory_stops (
  memory_id uuid not null references public.memories(id) on delete cascade,
  position smallint not null check (position between 0 and 19),
  name text not null check (char_length(name) between 1 and 100),
  country_code text check (country_code ~ '^[A-Z]{2}$'),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  primary key (memory_id, position)
);

alter table public.memory_stops enable row level security;

-- Lecture par l'audience du souvenir. Écritures uniquement via set_memory_stops().
create policy "memory_stops_select" on public.memory_stops for select to authenticated
  using (public.can_see_memory(memory_id));

revoke all on public.memory_stops from anon;
revoke insert, update, delete on public.memory_stops from authenticated;

-- Remplace toutes les étapes d'un souvenir. p_stops : [{"name","country_code","lat","lng"}, …] dans l'ordre.
create function public.set_memory_stops(mid uuid, p_stops jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from memories where id = mid and author_id = auth.uid()) then
    raise exception 'Réservé à l''auteur';
  end if;
  if jsonb_typeof(coalesce(p_stops, '[]')) <> 'array' or jsonb_array_length(coalesce(p_stops, '[]')) > 20 then
    raise exception 'Étapes invalides';
  end if;

  delete from memory_stops where memory_id = mid;
  insert into memory_stops (memory_id, position, name, country_code, lat, lng)
  select mid, (s.ord - 1)::smallint, s.value->>'name', upper(s.value->>'country_code'),
         (s.value->>'lat')::double precision, (s.value->>'lng')::double precision
  from jsonb_array_elements(coalesce(p_stops, '[]')) with ordinality as s(value, ord);
end; $$;

-- get_memories renvoie aussi les étapes et les premières photos (bande de photos du fil chronologique).
drop function public.get_memories(uuid, uuid);

create function public.get_memories(p_group_id uuid default null, p_friend_id uuid default null)
returns table (id uuid, author_id uuid, group_id uuid, kind text, title text, body text, place text,
               happened_on date, ends_on date, created_at timestamptz,
               cover_path text, photo_count bigint, people uuid[], photo_paths text[], stops jsonb)
language sql security definer stable set search_path = public as $$
  select m.id, m.author_id, m.group_id, m.kind, m.title, m.body, m.place,
         m.happened_on, m.ends_on, m.created_at,
         (select ph.path from memory_photos ph where ph.memory_id = m.id order by ph.created_at limit 1),
         (select count(*) from memory_photos ph where ph.memory_id = m.id),
         coalesce((select array_agg(p.user_id) from memory_people p where p.memory_id = m.id), '{}'),
         coalesce((select array_agg(x.path) from (
           select ph.path from memory_photos ph where ph.memory_id = m.id order by ph.created_at limit 3
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
  order by coalesce(m.happened_on, m.created_at::date) desc, m.created_at desc;
$$;

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.set_memory_stops(uuid, jsonb),
  public.get_memories(uuid, uuid)
to authenticated;
-- Le revoke global ci-dessus s'applique aussi aux fonctions des migrations précédentes :
-- on rend à anon l'aperçu d'invitation.
grant execute on function public.get_group_preview(text) to anon;
