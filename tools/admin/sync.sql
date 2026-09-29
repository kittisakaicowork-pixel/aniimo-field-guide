-- Aniimo Field Guide: sync a visitor's checklists across devices with a sync code (run once in Supabase → SQL Editor)
--
-- No accounts: the site makes a random 24-character code; whoever has the code can read and replace that
-- one saved copy (collection, daily/weekly checklist, beginner checklist). Codes cannot be listed, and the
-- table itself is closed; everything goes through the two functions below. Safe to run again.

create table if not exists public.sync_data (
  code       text primary key check (code ~ '^[A-Za-z0-9]{20,40}$'),
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.sync_data enable row level security;
revoke all on public.sync_data from anon, authenticated;

create or replace function public.sync_get(p_code text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('data', data, 'at', updated_at) from sync_data where code = p_code
$$;

create or replace function public.sync_put(p_code text, p_data jsonb)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare t timestamptz;
begin
  if p_code !~ '^[A-Za-z0-9]{20,40}$' then raise exception 'bad code'; end if;
  if pg_column_size(p_data) > 200000 then raise exception 'too big'; end if;
  insert into sync_data (code, data, updated_at) values (p_code, p_data, now())
  on conflict (code) do update set data = excluded.data, updated_at = now()
  returning updated_at into t;
  return t;
end $$;

revoke all on function public.sync_get(text), public.sync_put(text, jsonb) from public;
grant execute on function public.sync_get(text), public.sync_put(text, jsonb) to anon, authenticated;
