-- Inviter dans un groupe un·e ami·e existant·e (quelqu'un avec qui je partage déjà un groupe).
-- Pas de recherche : on ne peut inviter que des personnes qu'on voit déjà.
-- L'invitation doit être acceptée : personne n'est ajouté à un groupe sans son accord.
create table public.group_invitations (
  group_id uuid not null references public.groups(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, invitee_id)
);
create index group_invitations_invitee_idx on public.group_invitations (invitee_id);
create index group_invitations_inviter_idx on public.group_invitations (inviter_id);

alter table public.group_invitations enable row level security;
-- Lecture seule côté client ; toute écriture passe par les RPC ci-dessous.
revoke all on public.group_invitations from anon, authenticated;
grant select on public.group_invitations to authenticated;
create policy "group_invitations_select" on public.group_invitations for select to authenticated
  using (invitee_id = auth.uid() or public.is_group_member(group_id));

-- Mes ami·es qui ne sont pas encore dans ce groupe (et si je les ai déjà invité·es).
create function public.get_invitable_friends(gid uuid)
returns table (id uuid, display_name text, avatar_url text, pin_color text,
               city text, country_code text, invited boolean)
language sql security definer stable set search_path = public as $$
  select p.id, p.display_name, p.avatar_url, p.pin_color, p.city, p.country_code,
         exists (select 1 from group_invitations i where i.group_id = gid and i.invitee_id = p.id)
  from profiles p
  where public.is_group_member(gid)
    and p.id <> auth.uid()
    and public.shares_group_with(p.id)
    and not exists (select 1 from group_members m where m.group_id = gid and m.user_id = p.id)
  order by p.display_name;
$$;

create function public.invite_to_group(gid uuid, uid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_group_member(gid) then raise exception 'Réservé aux membres du groupe'; end if;
  if uid = auth.uid() or not shares_group_with(uid) then
    raise exception 'Tu ne peux inviter que tes amis';
  end if;
  if exists (select 1 from group_members where group_id = gid and user_id = uid) then
    raise exception 'Déjà dans le groupe';
  end if;
  insert into group_invitations (group_id, invitee_id, inviter_id)
  values (gid, uid, auth.uid()) on conflict do nothing;
end; $$;

-- N'importe quel membre du groupe peut retirer une invitation en attente.
create function public.cancel_group_invitation(gid uuid, uid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_group_member(gid) then raise exception 'Réservé aux membres du groupe'; end if;
  delete from group_invitations where group_id = gid and invitee_id = uid;
end; $$;

-- Les invitations que j'ai reçues (accueil). L'invité·e ne voit que le nom du groupe,
-- son nombre de membres et qui l'invite, comme avec un lien d'invitation.
create function public.get_my_invitations()
returns table (group_id uuid, name text, emoji text, color text, member_count bigint,
               inviter_name text, created_at timestamptz)
language sql security definer stable set search_path = public as $$
  select g.id, g.name, g.emoji, g.color,
         (select count(*) from group_members m where m.group_id = g.id),
         p.display_name, i.created_at
  from group_invitations i
  join groups g on g.id = i.group_id
  left join profiles p on p.id = i.inviter_id
  where i.invitee_id = auth.uid()
  order by i.created_at desc;
$$;

create function public.respond_to_invitation(gid uuid, accept boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from group_invitations where group_id = gid and invitee_id = auth.uid()) then
    raise exception 'Invitation introuvable';
  end if;
  if accept then
    insert into group_members (group_id, user_id) values (gid, auth.uid()) on conflict do nothing;
  end if;
  delete from group_invitations where group_id = gid and invitee_id = auth.uid();
end; $$;

-- Rejoindre un groupe (par lien ou par invitation) efface l'invitation en attente.
create function public.clear_group_invitation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from group_invitations where group_id = new.group_id and invitee_id = new.user_id;
  return new;
end; $$;

create trigger group_members_clear_invitation
after insert on public.group_members
for each row execute function public.clear_group_invitation();

revoke execute on function
  public.get_invitable_friends(uuid),
  public.invite_to_group(uuid, uuid),
  public.cancel_group_invitation(uuid, uuid),
  public.get_my_invitations(),
  public.respond_to_invitation(uuid, boolean),
  public.clear_group_invitation()
from public, anon;
grant execute on function
  public.get_invitable_friends(uuid),
  public.invite_to_group(uuid, uuid),
  public.cancel_group_invitation(uuid, uuid),
  public.get_my_invitations(),
  public.respond_to_invitation(uuid, boolean)
to authenticated;
