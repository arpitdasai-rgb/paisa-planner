-- Paisa Planner · update 4: family edits merge instead of overwriting each other
-- Run once in Supabase → SQL Editor (after schema.sql, v2.sql, v3.sql). Safe to run again. Keeps all your data.
-- Without it the app still works, but two people editing the same month's budgets at once can overwrite each other.

-- set one field deep inside a JSON object, creating parents as needed; a null value removes the field
create or replace function public.jsonb_set_deep(t jsonb, p text[], v jsonb) returns jsonb
language plpgsql immutable as $$
declare base jsonb := case when jsonb_typeof(t) = 'object' then t else '{}'::jsonb end;
begin
  if p is null or array_length(p, 1) is null then return coalesce(v, base); end if;
  if array_length(p, 1) = 1 then
    if v is null or v = 'null'::jsonb then return base - p[1]; end if;
    return jsonb_set(base, p[1:1], v, true);
  end if;
  return jsonb_set(base, p[1:1], public.jsonb_set_deep(base -> p[1], p[2:], v), true);
end $$;

-- change one field of a family record. Runs with the caller's rights, so row-level security still decides who may change what.
-- The row is locked while it changes, so edits from two phones are applied one after the other and both are kept.
create or replace function public.patch_doc(p_col text, p_id text, p_path text[], p_value jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare fid uuid := public.my_family();
begin
  if fid is null then raise exception 'You are not in a family.'; end if;
  if p_path is null or array_length(p_path, 1) is null or array_length(p_path, 1) > 6 then raise exception 'Bad field.'; end if;
  update docs set data = public.jsonb_set_deep(case when deleted then '{}'::jsonb else data end, p_path, p_value), deleted = false
    where family_id = fid and col = p_col and id = p_id;
  if not found then
    insert into docs (family_id, col, id, data, deleted)
    values (fid, p_col, p_id, public.jsonb_set_deep('{}'::jsonb, p_path, p_value), false)
    on conflict (family_id, col, id) do update set data = public.jsonb_set_deep(docs.data, p_path, p_value), deleted = false;
  end if;
end $$;
revoke all on function public.patch_doc(text, text, text[], jsonb) from anon;
grant execute on function public.patch_doc(text, text, text[], jsonb) to authenticated;
