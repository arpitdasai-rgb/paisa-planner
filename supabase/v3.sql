-- Paisa Planner · update 3: Recently deleted (30-day restore) shared across the family
-- Run once in Supabase → SQL Editor (after schema.sql and v2.sql). Safe to run again. Keeps all your data.
-- Without it the app still works: deleted items are kept for restore on the phone that deleted them.

-- 1. allow the "trash" kind of data
alter table public.docs drop constraint if exists docs_col_check;
alter table public.docs add constraint docs_col_check
  check (col in ('settings','cats','tx','months','bills','loans','cards','goals','log','accounts','recurring','assets','trash'));

-- 2. Members may save what they deleted (their own entries) and clear it again
drop policy if exists docs_insert on public.docs;
create policy docs_insert on public.docs for insert with check (
  created_by = auth.uid() and (
    public.my_role(family_id) in ('owner','admin')
    or (public.my_role(family_id) = 'member' and col in ('tx','bills','log','trash'))
  ));

drop policy if exists docs_update on public.docs;
create policy docs_update on public.docs for update
  using (
    public.my_role(family_id) in ('owner','admin')
    or (public.my_role(family_id) = 'member' and (col in ('bills','log') or (col in ('tx','trash') and created_by = auth.uid())))
  )
  with check (
    public.my_role(family_id) in ('owner','admin')
    or (public.my_role(family_id) = 'member' and col in ('tx','bills','log','trash'))
  );
