-- Aniimo Field Guide: real use vs. quick exits (run once in Supabase → SQL Editor, after supabase.sql)
--
-- Each browser tab gets a random visit id (session) that ends after 30 minutes without activity.
-- A visit counts as "used" (engaged) when the visitor opens 2+ pages, opens an Aniimo/item, searches,
-- or stays 10+ seconds on a visible page after tapping, scrolling or typing. The site then records one
-- 'engage' row for that visit. It also records 'leave' rows with the visit's active seconds so far
-- (key = seconds) whenever the tab is hidden or closed. Rows stay anonymous like the rest of events.

alter table public.events add column if not exists session text check (char_length(session) <= 40);
alter table public.events drop constraint if exists events_kind_check;
alter table public.events add constraint events_kind_check
  check (kind in ('view', 'mon', 'item', 'search', 'engage', 'leave'));
grant insert (kind, key, visitor, device, lang, tz, session) on public.events to anon, authenticated;
create index if not exists events_session_at on public.events (session, at) where session is not null;

create or replace function public.stats_engagement(days int default 7)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  since timestamptz := now() - make_interval(days => greatest(1, least(days, 365)));
  result json;
begin
  if not is_owner() then
    raise exception 'owner only' using errcode = '42501';
  end if;
  with s as (
    select session,
           min(at) as first_at,
           (array_agg(key order by at) filter (where kind = 'view'))[1] as landing,
           count(*) filter (where kind = 'view') as pages,
           bool_or(kind = 'engage') as engaged,
           (array_agg(key order by at) filter (where kind = 'engage'))[1] as reason,
           coalesce(max(case when kind = 'leave' and key ~ '^\d{1,6}$' then key::int end), 0) as secs,
           max(device) as device
    from events
    where at >= since and session is not null
    group by session
    having count(*) filter (where kind = 'view') > 0
  )
  select json_build_object(
    'since',    (select min(at) from events where session is not null),
    'sessions', (select count(*) from s),
    'engaged',  (select count(*) from s where engaged),
    'avg_pages',(select round(avg(pages), 1) from s),
    'avg_secs_engaged', (select round(avg(secs)) from s where engaged and secs > 0),
    'median_secs_engaged', (select percentile_cont(0.5) within group (order by secs) from s where engaged and secs > 0),
    'daily', (select coalesce(json_agg(json_build_object('day', d, 's', n, 'e', e) order by d), '[]')
              from (select (first_at at time zone 'Asia/Bangkok')::date d, count(*) n, count(*) filter (where engaged) e
                    from s group by 1) x),
    'devices', (select coalesce(json_agg(json_build_object('key', k, 's', n, 'e', e) order by n desc), '[]')
                from (select coalesce(device, 'unknown') k, count(*) n, count(*) filter (where engaged) e from s group by 1) x),
    'landing', (select coalesce(json_agg(json_build_object('key', k, 's', n, 'e', e) order by n desc), '[]')
                from (select landing k, count(*) n, count(*) filter (where engaged) e from s group by 1 order by 2 desc limit 10) x),
    'reasons', (select coalesce(json_agg(json_build_object('key', k, 'n', n) order by n desc), '[]')
                from (select reason k, count(*) n from s where engaged group by 1) x),
    'time', (select coalesce(json_agg(json_build_object('key', b, 'n', n) order by b), '[]')
             from (select case when secs < 10 then 1 when secs < 30 then 2 when secs < 60 then 3
                               when secs < 180 then 4 when secs < 600 then 5 else 6 end b, count(*) n
                   from s group by 1) x)
  ) into result;
  return result;
end $$;

revoke all on function public.stats_engagement(int) from public, anon;
grant execute on function public.stats_engagement(int) to authenticated;
