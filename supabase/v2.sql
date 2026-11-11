-- Paisa Planner · update 2: bank accounts, recurring entries, net worth, delete my account
-- Run once in Supabase → SQL Editor (after schema.sql). Safe to run again. Keeps all your data.

-- 1. allow the new kinds of data
alter table public.docs drop constraint if exists docs_col_check;
alter table public.docs add constraint docs_col_check
  check (col in ('settings','cats','tx','months','bills','loans','cards','goals','log','accounts','recurring','assets'));

-- 2. who-changed-what stamp: unchanged, except the account-deletion step below may reassign entries
create or replace function public.docs_stamp() returns trigger
language plpgsql as $$
begin
  if coalesce(current_setting('paisa.reassign', true), '') = 'on' then return new; end if;
  new.updated_by := auth.uid();
  new.updated_at := now();
  if tg_op = 'UPDATE' then new.created_by := old.created_by; end if;
  return new;
end $$;

-- 3. delete my account (DA-3): removes the person's sign-in, profile, reminders and membership.
--    Their past entries stay with the family, marked with their name.
--    An Owner with other members must hand over ownership first; an Owner alone deletes the family too.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid(); fid uuid; r public.family_role; others int;
begin
  if uid is null then raise exception 'Sign in first.'; end if;
  select family_id, role into fid, r from public.family_members where user_id = uid;
  if fid is not null and r = 'owner' then
    select count(*) into others from public.family_members where family_id = fid and user_id <> uid;
    if others > 0 then raise exception 'Hand over ownership to an Admin before deleting your account.'; end if;
    delete from public.families where id = fid;           -- alone: the family and its data go too
  end if;
  delete from public.family_members where user_id = uid;
  delete from public.push_subscriptions where user_id = uid;
  perform set_config('paisa.reassign', 'on', true);       -- only for the rest of this call
  update public.docs set created_by = (select owner_id from public.families f where f.id = docs.family_id)
    where created_by = uid and family_id is not null;     -- keep their entries with the family
  update public.docs set updated_by = null where updated_by = uid;
  perform set_config('paisa.reassign', 'off', true);
  update public.invites set invited_by = null where invited_by = uid;
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end $$;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;
