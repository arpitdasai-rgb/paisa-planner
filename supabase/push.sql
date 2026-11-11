-- Paisa Planner · scheduled reminders (web push)
-- Run once in Supabase → SQL Editor, after schema.sql. Safe to run again.
-- Stores each phone's push address so a daily job can send bill reminders
-- even when the app is closed. Nobody can read another person's rows.

create table if not exists public.push_subscriptions (
  endpoint    text primary key,                 -- the phone/browser's push address
  user_id     uuid not null references public.profiles (id) on delete cascade,
  p256dh      text not null,
  auth        text not null,
  prefs       jsonb not null default '{"bills": true, "evening": false, "weekly": false}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists push_subscriptions_user on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
drop policy if exists push_read_own on public.push_subscriptions;
create policy push_read_own on public.push_subscriptions for select using (user_id = auth.uid());
-- all writes go through the two functions below

-- Save (or move to this account) a phone's push address and reminder choices.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_prefs jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if p_endpoint !~ '^https://' then raise exception 'Not a push address.'; end if;
  insert into push_subscriptions (endpoint, user_id, p256dh, auth, prefs)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth, coalesce(p_prefs, '{"bills": true}'::jsonb))
  on conflict (endpoint) do update
    set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth, prefs = excluded.prefs, updated_at = now();
end $$;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
end $$;

revoke all on function public.save_push_subscription(text, text, text, jsonb), public.delete_push_subscription(text) from anon;
grant execute on function public.save_push_subscription(text, text, text, jsonb), public.delete_push_subscription(text) to authenticated;
