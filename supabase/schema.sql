-- Paisa Planner · Supabase schema
-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- WARNING: running it again DELETES all Paisa Planner data (it drops and recreates its own tables).
--
-- Model: every row belongs to a family (PRD §8). Roles: owner / admin / member / viewer (PRD §5.10).
-- Budget data lives in one "docs" table (one JSON document per category, entry, month, loan, card,
-- goal, bill-status, log line) so the app's offline cache and realtime sync stay simple.
-- Row-level security enforces the PRD's role table on the server.

-- ───────────── clean slate (Paisa objects only) ─────────────
drop trigger if exists paisa_on_auth_user_created on auth.users;
drop table if exists public.docs cascade;
drop table if exists public.invites cascade;
drop table if exists public.family_members cascade;
drop table if exists public.families cascade;
drop table if exists public.profiles cascade;
drop type if exists public.family_role cascade;

create extension if not exists pgcrypto;

-- ───────────── tables ─────────────
create type public.family_role as enum ('owner', 'admin', 'member', 'viewer');

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,          -- the Gmail address: unique identity (ON-1)
  name        text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create table public.families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  owner_id    uuid not null references public.profiles (id),
  created_at  timestamptz not null default now()
);

create table public.family_members (
  family_id   uuid not null references public.families (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        public.family_role not null,
  joined_at   timestamptz not null default now(),
  primary key (family_id, user_id),
  unique (user_id)                           -- one Gmail = one family (FM-3)
);

create table public.invites (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  email       text not null,
  role        public.family_role not null check (role <> 'owner'),
  invited_by  uuid references public.profiles (id) on delete set null,
  family_name text,                          -- shown to the invitee, who cannot read the family yet
  inviter_name text,
  status      text not null default 'pending' check (status in ('pending','accepted','declined','expired','revoked')),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days'   -- FM-4
);
create unique index invites_one_pending on public.invites (family_id, lower(email)) where status = 'pending';

create table public.docs (
  family_id   uuid not null references public.families (id) on delete cascade,
  col         text not null check (col in ('settings','cats','tx','months','bills','loans','cards','goals','log')),
  id          text not null check (char_length(id) between 1 and 64),
  data        jsonb,
  deleted     boolean not null default false,  -- soft delete so realtime can filter by family
  created_by  uuid not null default auth.uid() references public.profiles (id),
  updated_by  uuid references public.profiles (id),
  updated_at  timestamptz not null default now(),
  primary key (family_id, col, id)
);
create index docs_family_updated on public.docs (family_id, updated_at);

-- ───────────── helpers ─────────────
create or replace function public.my_family() returns uuid
language sql stable security definer set search_path = public as $$
  select family_id from family_members where user_id = auth.uid()
$$;

create or replace function public.my_role(fid uuid) returns public.family_role
language sql stable security definer set search_path = public as $$
  select role from family_members where family_id = fid and user_id = auth.uid()
$$;

create or replace function public.my_email() returns text
language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

-- New Google sign-in → profile row with name, Gmail address and photo.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, name, avatar_url)
  values (new.id, lower(new.email),
          coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
          coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'))
  on conflict (id) do update set email = excluded.email, name = excluded.name, avatar_url = excluded.avatar_url;
  return new;
end $$;
create trigger paisa_on_auth_user_created after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_new_user();
-- backfill users who signed in before this script ran
insert into public.profiles (id, email, name, avatar_url)
select id, lower(email), coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', split_part(email, '@', 1)),
       coalesce(raw_user_meta_data ->> 'avatar_url', raw_user_meta_data ->> 'picture')
from auth.users where email is not null
on conflict (id) do nothing;

-- Who changed a doc and when (FM-7); created_by never changes.
create or replace function public.docs_stamp() returns trigger
language plpgsql as $$
begin
  new.updated_by := auth.uid();
  new.updated_at := now();
  if tg_op = 'UPDATE' then new.created_by := old.created_by; end if;
  return new;
end $$;
create trigger docs_stamp before insert or update on public.docs for each row execute function public.docs_stamp();

-- ───────────── row-level security ─────────────
alter table public.profiles       enable row level security;
alter table public.families       enable row level security;
alter table public.family_members enable row level security;
alter table public.invites        enable row level security;
alter table public.docs           enable row level security;

-- profiles: yourself and people in your family
create policy profiles_read on public.profiles for select
  using (id = auth.uid() or id in (select user_id from public.family_members where family_id = public.my_family()));
create policy profiles_update_self on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- families: members read; owner/admin rename
create policy families_read on public.families for select using (id = public.my_family());
create policy families_rename on public.families for update
  using (public.my_role(id) in ('owner','admin')) with check (public.my_role(id) in ('owner','admin'));

-- members: read your family; all changes go through the functions below
create policy members_read on public.family_members for select using (family_id = public.my_family());

-- invites: owner/admin of the family, or the invited Gmail address
create policy invites_read on public.invites for select
  using ((family_id = public.my_family() and public.my_role(family_id) in ('owner','admin')) or lower(email) = public.my_email());

-- docs: everyone in the family reads; writes follow the role table
create policy docs_read on public.docs for select using (family_id = public.my_family());

create policy docs_insert on public.docs for insert with check (
  created_by = auth.uid() and (
    public.my_role(family_id) in ('owner','admin')
    or (public.my_role(family_id) = 'member' and col in ('tx','bills','log'))
  ));

create policy docs_update on public.docs for update
  using (
    public.my_role(family_id) in ('owner','admin')
    or (public.my_role(family_id) = 'member' and (col in ('bills','log') or (col = 'tx' and created_by = auth.uid())))
  )
  with check (
    public.my_role(family_id) in ('owner','admin')
    or (public.my_role(family_id) = 'member' and col in ('tx','bills','log'))
  );
-- no hard deletes from the app (soft delete via "deleted"); families cascade on delete_family()

-- ───────────── family functions (all checks on the server) ─────────────
create or replace function public.create_family(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if exists (select 1 from family_members where user_id = auth.uid()) then
    raise exception 'You are already in a family. Leave it first.';
  end if;
  insert into families (name, owner_id) values (coalesce(nullif(trim(p_name), ''), 'Our family budget'), auth.uid()) returning id into fid;
  insert into family_members (family_id, user_id, role) values (fid, auth.uid(), 'owner');
  return fid;
end $$;

create or replace function public.invite_member(p_email text, p_role public.family_role) returns uuid
language plpgsql security definer set search_path = public as $$
declare fid uuid := my_family(); e text := lower(trim(p_email)); iid uuid;
begin
  if my_role(fid) not in ('owner','admin') then raise exception 'Only the Owner or an Admin can invite.'; end if;
  if p_role = 'owner' then raise exception 'Invite as Admin, then hand over ownership.'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid Gmail address.'; end if;
  if exists (select 1 from family_members m join profiles p on p.id = m.user_id where p.email = e and m.family_id = fid) then
    raise exception 'This person is already in your family.';
  end if;
  if exists (select 1 from family_members m join profiles p on p.id = m.user_id where p.email = e) then
    raise exception 'This person is already in another family. They must leave it first.';
  end if;
  update invites set status = 'expired' where family_id = fid and status = 'pending' and expires_at < now();
  if (select count(*) from family_members where family_id = fid)
     + (select count(*) from invites where family_id = fid and status = 'pending' and lower(email) <> e) >= 8 then
    raise exception 'A family can have up to 8 members.';
  end if;
  update invites set status = 'revoked' where family_id = fid and status = 'pending' and lower(email) = e;
  insert into invites (family_id, email, role, invited_by, family_name, inviter_name)
  values (fid, e, p_role, auth.uid(), (select name from families where id = fid), (select coalesce(name, email) from profiles where id = auth.uid()))
  returning id into iid;
  return iid;
end $$;

create or replace function public.accept_invite(p_invite uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv invites%rowtype;
begin
  select * into inv from invites where id = p_invite for update;
  if not found or lower(inv.email) <> my_email() then raise exception 'This invite is not for your account.'; end if;
  if inv.status <> 'pending' then raise exception 'This invite is no longer active.'; end if;
  if inv.expires_at < now() then
    update invites set status = 'expired' where id = p_invite;
    raise exception 'This invite has expired. Ask for a new one.';
  end if;
  -- checked again at accept time (PRD §7)
  if exists (select 1 from family_members where user_id = auth.uid()) then
    raise exception 'You are already in another family. Leave it first.';
  end if;
  if (select count(*) from family_members where family_id = inv.family_id) >= 8 then
    raise exception 'This family is full (8 members).';
  end if;
  insert into family_members (family_id, user_id, role) values (inv.family_id, auth.uid(), inv.role);
  update invites set status = 'accepted' where id = p_invite;
  return inv.family_id;
end $$;

create or replace function public.decline_invite(p_invite uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update invites set status = 'declined' where id = p_invite and lower(email) = my_email() and status = 'pending';
end $$;

create or replace function public.revoke_invite(p_invite uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update invites set status = 'revoked'
  where id = p_invite and status = 'pending' and family_id = my_family() and my_role(my_family()) in ('owner','admin');
  if not found then raise exception 'Could not revoke this invite.'; end if;
end $$;

create or replace function public.set_member_role(p_user uuid, p_role public.family_role) returns void
language plpgsql security definer set search_path = public as $$
declare fid uuid := my_family(); target public.family_role;
begin
  if my_role(fid) not in ('owner','admin') then raise exception 'Only the Owner or an Admin can change roles.'; end if;
  if p_role = 'owner' then raise exception 'Use "Make owner" to hand over ownership.'; end if;
  select role into target from family_members where family_id = fid and user_id = p_user;
  if target is null then raise exception 'That person is not in your family.'; end if;
  if target = 'owner' then raise exception 'The Owner''s role cannot be changed.'; end if;
  update family_members set role = p_role where family_id = fid and user_id = p_user;
end $$;

create or replace function public.remove_member(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare fid uuid := my_family(); target public.family_role;
begin
  if my_role(fid) not in ('owner','admin') then raise exception 'Only the Owner or an Admin can remove members.'; end if;
  select role into target from family_members where family_id = fid and user_id = p_user;
  if target is null then raise exception 'That person is not in your family.'; end if;
  if target = 'owner' then raise exception 'The Owner cannot be removed.'; end if;
  delete from family_members where family_id = fid and user_id = p_user;   -- their past entries stay (FM-5)
end $$;

create or replace function public.leave_family() returns void
language plpgsql security definer set search_path = public as $$
declare fid uuid := my_family();
begin
  if fid is null then return; end if;
  if my_role(fid) = 'owner' then raise exception 'Hand over ownership to an Admin before you leave.'; end if;
  delete from family_members where family_id = fid and user_id = auth.uid();
end $$;

create or replace function public.transfer_ownership(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare fid uuid := my_family();
begin
  if my_role(fid) <> 'owner' then raise exception 'Only the Owner can hand over ownership.'; end if;
  if (select role from family_members where family_id = fid and user_id = p_user) is distinct from 'admin' then
    raise exception 'Make this person an Admin first.';
  end if;
  update family_members set role = 'admin' where family_id = fid and user_id = auth.uid();
  update family_members set role = 'owner' where family_id = fid and user_id = p_user;
  update families set owner_id = p_user where id = fid;
end $$;

create or replace function public.delete_family() returns void
language plpgsql security definer set search_path = public as $$
declare fid uuid := my_family();
begin
  if my_role(fid) <> 'owner' then raise exception 'Only the Owner can delete the family.'; end if;
  delete from families where id = fid;    -- cascades to members, invites and all budget data (DA-3)
end $$;

revoke all on function public.my_family(), public.my_role(uuid) from anon;
grant execute on function
  public.create_family(text), public.invite_member(text, public.family_role), public.accept_invite(uuid),
  public.decline_invite(uuid), public.revoke_invite(uuid), public.set_member_role(uuid, public.family_role),
  public.remove_member(uuid), public.leave_family(), public.transfer_ownership(uuid), public.delete_family()
  to authenticated;

-- ───────────── realtime (family members see changes within seconds) ─────────────
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.docs; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.family_members; exception when duplicate_object then null; end;
  end if;
end $$;
