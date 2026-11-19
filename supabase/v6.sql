-- Paisa Planner · update 6: security hardening flagged by Supabase's advisors
-- Run once in Supabase → SQL Editor (after v5.sql). Safe to run again. Changes no data.

-- 1. Family functions run with elevated rights, so only signed-in people may call them.
--    (Each already refuses signed-out callers inside; this stops them reaching the function at all.)
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and p.proname in ('accept_invite','create_family','decline_invite','delete_family','delete_my_account','delete_push_subscription',
                        'invite_member','leave_family','my_family','my_role','remove_member','revoke_invite','save_push_subscription',
                        'set_member_role','transfer_ownership')
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated, service_role', f.sig);
  end loop;
end $$;

-- 2. The sign-up trigger helper is never called directly by anyone.
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname='public' and p.proname='handle_new_user') then
    revoke execute on function public.handle_new_user() from public, anon, authenticated;
  end if;
end $$;

-- 3. Fix the search path on the two remaining functions.
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname='public' and p.proname='my_email') then
    alter function public.my_email() set search_path = public; end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname='public' and p.proname='docs_stamp') then
    alter function public.docs_stamp() set search_path = public; end if;
end $$;
