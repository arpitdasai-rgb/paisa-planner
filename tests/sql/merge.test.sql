-- Paisa SQL tests: family set-up, field-level merges (v4), and role rules on merges.
-- Run with tests/sql/run.sh. Any failed check raises an error and stops the run.
\set ON_ERROR_STOP on
grant select, insert, update on all tables in schema public to authenticated;

-- three people: an owner, a member and a viewer
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'owner@gmail.com',  '{"full_name":"Owner"}'),
  ('00000000-0000-0000-0000-00000000000b', 'member@gmail.com', '{"full_name":"Member"}'),
  ('00000000-0000-0000-0000-00000000000c', 'viewer@gmail.com', '{"full_name":"Viewer"}');

create or replace function pg_temp.act_as(uid text, email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, false), set_config('request.jwt.claims', json_build_object('sub', uid, 'email', email)::text, false), set_config('role', 'authenticated', false);
$$;
create or replace function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if; raise notice 'ok  %', what; end $$;

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a', 'owner@gmail.com');
select public.create_family('Test family');
select public.invite_member('member@gmail.com', 'member');
select public.invite_member('viewer@gmail.com', 'viewer');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b', 'member@gmail.com');
select public.accept_invite((select id from public.invites where email = 'member@gmail.com'));
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c', 'viewer@gmail.com');
select public.accept_invite((select id from public.invites where email = 'viewer@gmail.com'));

-- the owner sets two budgets in the same month, one field at a time: both are kept
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a', 'owner@gmail.com');
select public.patch_doc('months', '2026-11', array['b','rent'], '3000000');
select public.patch_doc('months', '2026-11', array['b','food'], '800000');
select public.patch_doc('months', '2026-11', array['open'], '4000000');
select pg_temp.check((select data from public.docs where col='months' and id='2026-11') = '{"b":{"rent":3000000,"food":800000},"open":4000000}'::jsonb, 'two budget changes in one month both kept');
select public.patch_doc('months', '2026-11', array['b','food'], null);
select pg_temp.check((select data->'b' from public.docs where col='months' and id='2026-11') = '{"rent":3000000}'::jsonb, 'a null value removes just that field');
select public.patch_doc('cards', 'k1', array['stmts','2026-11'], '{"amt":3043700,"paid":0}');
select pg_temp.check((select data #>> '{stmts,2026-11,amt}' from public.docs where col='cards' and id='k1') = '3043700', 'nested field created on a new record');

-- a member may mark bills (allowed for members), and it merges with the owner's skip
select public.patch_doc('bills', '2026-11', array['skip','rent'], 'true');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b', 'member@gmail.com');
select public.patch_doc('bills', '2026-11', array['skip','emi'], 'true');
select pg_temp.check((select data->'skip' from public.docs where col='bills' and id='2026-11') = '{"rent":true,"emi":true}'::jsonb, 'member bill mark merged with owner''s');

-- a member may NOT change budgets, and a viewer may change nothing
do $$ begin
  perform public.patch_doc('months', '2026-11', array['b','rent'], '1');
  raise exception 'FAILED: member changed a budget';
exception when insufficient_privilege then raise notice 'ok  member blocked from changing a budget';
end $$;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c', 'viewer@gmail.com');
do $$ begin
  perform public.patch_doc('bills', '2026-11', array['skip','x'], 'true');
  raise exception 'FAILED: viewer marked a bill';
exception when insufficient_privilege then raise notice 'ok  viewer blocked from marking a bill';
end $$;
select pg_temp.check((select data #>> '{b,rent}' from public.docs where col='months' and id='2026-11') = '3000000', 'blocked changes left the record as it was');

-- Recently deleted (v3): a member can save what they deleted
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b', 'member@gmail.com');
insert into public.docs (family_id, col, id, data) values (public.my_family(), 'trash', 't1', '{"label":"x"}');
select pg_temp.check(exists (select 1 from public.docs where col='trash' and id='t1'), 'member can save to Recently deleted');
\echo ALL SQL CHECKS PASSED
