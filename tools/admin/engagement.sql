-- Aniimo Field Guide: real use vs. quick exits (run once in Supabase → SQL Editor, after supabase.sql)
--
-- Each browser tab gets a random visit id (session) that ends after 30 minutes without activity.
-- A visit counts as "used" (engaged) when the visitor opens 2+ different pages, opens an Aniimo/item,
-- searches, stays 10+ seconds on a visible page after tapping, scrolling or typing, or stays 3+ minutes
-- (even on one page). The site then records one 'engage' row for that visit. It also records 'leave'
-- rows with the visit's active seconds so far (key = seconds) whenever the tab is hidden or closed.
--
-- Rows from before this was set up have no session. stats_engagement() rebuilds visits from them
-- (same browser, gaps under 30 minutes) and classifies them with what they have: 2+ pages, an opened
-- Aniimo/item, a search, or 3+ minutes between the first and last row. Those numbers are estimates.
-- Safe to run again: every statement replaces or skips what already exists.

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
  with measured as (  -- visits recorded with a session id
    select session as sid, false as est, min(at) as first_at,
           (array_agg(key order by at) filter (where kind = 'view'))[1] as landing,
           count(distinct key) filter (where kind = 'view') as pages,
           coalesce(max(case when kind = 'leave' and key ~ '^\d{1,6}$' then key::int end), 0) as secs,
           (array_agg(key order by at) filter (where kind = 'engage'))[1] as engage_reason,
           bool_or(kind in ('mon', 'item')) as opened, bool_or(kind = 'search') as searched,
           max(device) as device, count(*) as nrows
    from events
    where at >= since and session is not null
    group by session
    having count(*) filter (where kind = 'view') > 0
  ),
  old_rows as (  -- rows without a session: a new visit starts after 30 minutes of silence
    select at, kind, key, device, coalesce(visitor, id::text) as v,
           case when lag(at) over w is null or at - lag(at) over w > interval '30 minutes' then 1 else 0 end as brk
    from events
    where at >= since and session is null and kind in ('view', 'mon', 'item', 'search')
    window w as (partition by coalesce(visitor, id::text) order by at)
  ),
  old_numbered as (
    select *, sum(brk) over (partition by v order by at rows unbounded preceding) as n from old_rows
  ),
  estimated as (
    select v || '#' || n as sid, true as est, min(at) as first_at,
           (array_agg(key order by at) filter (where kind = 'view'))[1] as landing,
           count(distinct key) filter (where kind = 'view') as pages,
           extract(epoch from max(at) - min(at))::int as secs,
           null::text as engage_reason,
           bool_or(kind in ('mon', 'item')) as opened, bool_or(kind = 'search') as searched,
           max(device) as device, count(*) as nrows
    from old_numbered
    group by v, n
    having count(*) filter (where kind = 'view') > 0
  ),
  s as (
    select *, reason is not null as engaged
    from (
      select *, coalesce(engage_reason,
               case when pages >= 2 then 'pages' when opened then 'open' when searched then 'search'
                    when secs >= 180 then 'long' end) as reason
      from (select * from measured union all select * from estimated) u
    ) r
  )
  select json_build_object(
    'since',       (select min(at) from events where session is not null),
    'first',       (select min(at) from events),
    'sessions',    (select count(*) from s),
    'engaged',     (select count(*) from s where engaged),
    'est_sessions',(select count(*) from s where est),
    'est_engaged', (select count(*) from s where est and engaged),
    'avg_pages',   (select round(avg(pages), 1) from s),
    'avg_secs_engaged',    (select round(avg(secs)) from s where engaged and secs > 0),
    'median_secs_engaged', (select percentile_cont(0.5) within group (order by secs) from s where engaged and secs > 0),
    'daily', (select coalesce(json_agg(json_build_object('day', d, 's', n, 'e', e, 'es', es, 'ee', ee) order by d), '[]')
              from (select (first_at at time zone 'Asia/Bangkok')::date d, count(*) n, count(*) filter (where engaged) e,
                           count(*) filter (where est) es, count(*) filter (where est and engaged) ee
                    from s group by 1) x),
    'devices', (select coalesce(json_agg(json_build_object('key', k, 's', n, 'e', e) order by n desc), '[]')
                from (select coalesce(device, 'unknown') k, count(*) n, count(*) filter (where engaged) e from s group by 1) x),
    'landing', (select coalesce(json_agg(json_build_object('key', k, 's', n, 'e', e) order by n desc), '[]')
                from (select landing k, count(*) n, count(*) filter (where engaged) e from s group by 1 order by 2 desc limit 12) x),
    'reasons', (select coalesce(json_agg(json_build_object('key', k, 'n', n) order by n desc), '[]')
                from (select reason k, count(*) n from s where engaged group by 1) x),
    'time', (select coalesce(json_agg(json_build_object('key', b, 'n', n) order by b), '[]')
             from (select case when est and nrows = 1 then 0  -- one old row: time unknown
                               when secs < 10 then 1 when secs < 30 then 2 when secs < 60 then 3
                               when secs < 180 then 4 when secs < 600 then 5 else 6 end b, count(*) n
                   from s group by 1) x)
  ) into result;
  return result;
end $$;

revoke all on function public.stats_engagement(int) from public, anon;
grant execute on function public.stats_engagement(int) to authenticated;
