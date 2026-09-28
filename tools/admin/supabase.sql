-- Aniimo Field Guide: usage stats database (run once in Supabase → SQL Editor)
-- Visitors can only ADD anonymous usage rows. Nobody can read raw rows through the API.
-- Only the owner (logged in with the owner e-mail) can call stats_summary() for totals.

create table if not exists public.events (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  kind    text not null check (kind in ('view','mon','item','search')),
  key     text not null check (char_length(key) between 1 and 80),
  visitor text check (char_length(visitor) <= 40),
  device  text check (device in ('phone','tablet','desktop')),
  lang    text check (char_length(lang) <= 12),
  tz      text check (char_length(tz) <= 40)
);
create index if not exists events_at on public.events (at);
create index if not exists events_kind_at on public.events (kind, at);

-- explicit grants, so this works whether or not the project auto-exposes new tables
grant usage on schema public to anon, authenticated;
grant insert (kind, key, visitor, device, lang, tz) on public.events to anon, authenticated;
revoke select, update, delete on public.events from anon, authenticated;

alter table public.events enable row level security;
drop policy if exists "anyone can add usage" on public.events;
create policy "anyone can add usage" on public.events
  for insert to anon, authenticated
  with check (at between now() - interval '1 minute' and now() + interval '1 minute');
-- (no select/update/delete policies: raw rows stay private)

create or replace function public.is_owner() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'kittisakaicowork@gmail.com'
$$;

create or replace function public.stats_summary(days int default 7)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  since timestamptz := now() - make_interval(days => greatest(1, least(days, 365)));
  today timestamptz := (date_trunc('day', now() at time zone 'Asia/Bangkok')) at time zone 'Asia/Bangkok';
begin
  if not is_owner() then
    raise exception 'owner only' using errcode = '42501';
  end if;
  return json_build_object(
    'views',    (select count(*) from events where at >= since and kind = 'view'),
    'visitors', (select count(distinct visitor) from events where at >= since),
    'today',    (select count(*) from events where at >= today and kind = 'view'),
    'today_visitors', (select count(distinct visitor) from events where at >= today),
    'searches', (select count(*) from events where at >= since and kind = 'search'),
    'mon_views',(select count(*) from events where at >= since and kind = 'mon'),
    'daily', (select coalesce(json_agg(json_build_object('day', d, 'n', n, 'u', u) order by d), '[]')
              from (select (at at time zone 'Asia/Bangkok')::date d, count(*) filter (where kind = 'view') n, count(distinct visitor) u
                    from events where at >= since group by 1) x),
    'top_views',    (select coalesce(json_agg(json_build_object('key', key, 'n', n) order by n desc), '[]')
                     from (select key, count(*) n from events where at >= since and kind = 'view' group by key order by n desc limit 12) x),
    'top_mons',     (select coalesce(json_agg(json_build_object('key', key, 'n', n) order by n desc), '[]')
                     from (select key, count(*) n from events where at >= since and kind = 'mon' group by key order by n desc limit 10) x),
    'top_items',    (select coalesce(json_agg(json_build_object('key', key, 'n', n) order by n desc), '[]')
                     from (select key, count(*) n from events where at >= since and kind = 'item' group by key order by n desc limit 10) x),
    'top_searches', (select coalesce(json_agg(json_build_object('key', key, 'n', n) order by n desc), '[]')
                     from (select key, count(*) n from events where at >= since and kind = 'search' group by key order by n desc limit 10) x),
    'devices', (select coalesce(json_agg(json_build_object('key', device, 'n', n) order by n desc), '[]')
                from (select coalesce(device, 'unknown') device, count(distinct visitor) n from events where at >= since group by 1) x),
    'langs',   (select coalesce(json_agg(json_build_object('key', lang, 'n', n) order by n desc), '[]')
                from (select coalesce(lang, '?') lang, count(distinct visitor) n from events where at >= since group by 1 order by n desc limit 6) x),
    'zones',   (select coalesce(json_agg(json_build_object('key', tz, 'n', n) order by n desc), '[]')
                from (select coalesce(tz, '?') tz, count(distinct visitor) n from events where at >= since group by 1 order by n desc limit 6) x)
  );
end $$;

revoke all on function public.stats_summary(int) from public, anon;
grant execute on function public.stats_summary(int) to authenticated;
