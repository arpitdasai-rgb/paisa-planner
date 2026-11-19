-- Paisa Planner · update 5: anonymous usage counts (opt-in), feedback, and a version check
-- Run once in Supabase → SQL Editor (after v4.sql). Safe to run again. Keeps all your data.

-- The app asks this to know whether the Owner still has updates to run.
create or replace function public.paisa_schema_version() returns int language sql stable set search_path = '' as $$ select 5 $$;
grant execute on function public.paisa_schema_version() to anon, authenticated;

-- Opt-in usage counts: event names and small counts only. No amounts, notes, names or emails.
-- Anyone can add a row; nobody can read rows through the app (read them in the Supabase dashboard).
create table if not exists public.events (
  id         bigserial primary key,
  at         timestamptz not null default now(),
  install    text not null check (char_length(install) between 8 and 64),   -- a random id made on the phone
  name       text not null check (char_length(name) between 2 and 40),
  props      jsonb not null default '{}' check (pg_column_size(props) < 1024),
  app_v      text check (char_length(app_v) <= 20),
  mode       text check (char_length(mode) <= 12)
);
alter table public.events enable row level security;
drop policy if exists events_insert on public.events;
create policy events_insert on public.events for insert to anon, authenticated with check (true);
grant insert on public.events to anon, authenticated;
grant usage on sequence public.events_id_seq to anon, authenticated;

-- "Tell us what's confusing": a short note and the screen it came from.
create table if not exists public.feedback (
  id         bigserial primary key,
  at         timestamptz not null default now(),
  install    text not null check (char_length(install) between 8 and 64),
  screen     text check (char_length(screen) <= 24),
  text       text not null check (char_length(text) between 1 and 800),
  app_v      text check (char_length(app_v) <= 20)
);
alter table public.feedback enable row level security;
drop policy if exists feedback_insert on public.feedback;
create policy feedback_insert on public.feedback for insert to anon, authenticated with check (true);
grant insert on public.feedback to anon, authenticated;
grant usage on sequence public.feedback_id_seq to anon, authenticated;
