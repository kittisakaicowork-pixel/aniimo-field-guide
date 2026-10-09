-- AniiGuide community: player builds, Homeland layout codes, looking for friends (+ app install counts).
-- Run once in Supabase → SQL Editor, after supabase.sql and feedback.sql.
--
-- Visitors can only SEND posts; every post starts as 'pending' and is shown on the site only after the owner
-- approves it in the back office (หลังบ้าน → ชุมชน). Visitors read approved posts through community_list(),
-- which never returns the visitor id. A visitor can send at most 3 posts an hour, the whole site 60 an hour.

create table if not exists public.community_posts (
  id       bigint generated always as identity primary key,
  at       timestamptz not null default now(),
  kind     text not null check (kind in ('build', 'home', 'friend')),
  title    text not null check (char_length(title) between 3 and 80),
  body     text not null default '' check (char_length(body) <= 1000),
  data     jsonb not null default '{}'::jsonb check (pg_column_size(data) <= 2000),  -- build code, layout code, UID, Aniimo slug …
  server   text check (server in ('asia', 'america', 'europe')),
  visitor  text check (char_length(visitor) <= 40),
  status   text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided  timestamptz
);
create index if not exists community_posts_status_at on public.community_posts (status, at desc);
create index if not exists community_posts_visitor_at on public.community_posts (visitor, at desc);

grant usage on schema public to anon, authenticated;
grant insert (kind, title, body, data, server, visitor) on public.community_posts to anon, authenticated;
revoke select, update, delete on public.community_posts from anon, authenticated;

alter table public.community_posts enable row level security;
drop policy if exists "anyone can send a post" on public.community_posts;
create policy "anyone can send a post" on public.community_posts
  for insert to anon, authenticated
  with check (status = 'pending' and decided is null and at between now() - interval '1 minute' and now() + interval '1 minute');

-- spam brake: 3 posts an hour per visitor, 60 an hour for the whole site
create or replace function public.community_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from community_posts where at > now() - interval '1 hour' and visitor is not distinct from new.visitor) >= 3 then
    raise exception 'too many posts' using errcode = '54000';
  end if;
  if (select count(*) from community_posts where at > now() - interval '1 hour') >= 60 then
    raise exception 'too many posts' using errcode = '54000';
  end if;
  return new;
end $$;
drop trigger if exists community_rate_limit on public.community_posts;
create trigger community_rate_limit before insert on public.community_posts for each row execute function public.community_rate_limit();

-- public: approved posts only, newest first, without the visitor id
create or replace function public.community_list(only_kind text default null, lim int default 60)
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('id', id, 'at', at, 'kind', kind, 'title', title, 'body', body,
                                             'data', data, 'server', server) order by at desc), '[]')
  from (select * from community_posts where status = 'approved' and (only_kind is null or kind = only_kind)
        order by at desc limit greatest(1, least(lim, 200))) p;
$$;
grant execute on function public.community_list(text, int) to anon, authenticated;

-- owner: everything, and approve / reject / delete
create or replace function public.community_admin_list(only_status text default 'pending', lim int default 200)
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not is_owner() then raise exception 'owner only' using errcode = '42501'; end if;
  return (select coalesce(json_agg(row_to_json(p) order by p.at desc), '[]')
          from (select * from community_posts where only_status is null or status = only_status
                order by at desc limit greatest(1, least(lim, 500))) p);
end $$;
grant execute on function public.community_admin_list(text, int) to authenticated;

create or replace function public.community_set(pid bigint, new_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_owner() then raise exception 'owner only' using errcode = '42501'; end if;
  if new_status = 'delete' then delete from community_posts where id = pid; return; end if;
  update community_posts set status = new_status, decided = now() where id = pid;
end $$;
grant execute on function public.community_set(bigint, text) to authenticated;

-- how many people use the site as an installed app (the site logs 'app-installed' and 'app-open' views)
create or replace function public.stats_app(days int default 30)
returns json language plpgsql stable security definer set search_path = public as $$
declare since timestamptz := now() - make_interval(days => greatest(1, least(days, 365)));
begin
  if not is_owner() then raise exception 'owner only' using errcode = '42501'; end if;
  return json_build_object(
    'installs_all',  (select count(distinct visitor) from events where kind = 'view' and key = 'app-installed'),
    'installs',      (select count(distinct visitor) from events where kind = 'view' and key = 'app-installed' and at >= since),
    'app_users',     (select count(distinct visitor) from events where kind = 'view' and key = 'app-open' and at >= since),
    'app_users_all', (select count(distinct visitor) from events where kind = 'view' and key = 'app-open'));
end $$;
grant execute on function public.stats_app(int) to authenticated;
