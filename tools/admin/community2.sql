-- AniiGuide community, part 2: Q&A and discussion posts, and replies under any post.
-- Run once in Supabase → SQL Editor, after community.sql.
--
-- Replies work like posts: visitors can only send them, each starts 'pending', and only replies the owner
-- approves are shown. A visitor can send at most 6 replies an hour, the whole site 120 an hour.

-- 1) two more kinds of post
alter table public.community_posts drop constraint if exists community_posts_kind_check;
alter table public.community_posts add constraint community_posts_kind_check
  check (kind in ('build', 'home', 'friend', 'question', 'talk'));

-- 2) replies
create table if not exists public.community_replies (
  id       bigint generated always as identity primary key,
  at       timestamptz not null default now(),
  post_id  bigint not null references public.community_posts(id) on delete cascade,
  body     text not null check (char_length(body) between 2 and 1000),
  visitor  text check (char_length(visitor) <= 40),
  status   text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided  timestamptz
);
create index if not exists community_replies_post on public.community_replies (post_id, status, at);
create index if not exists community_replies_status_at on public.community_replies (status, at desc);

grant insert (post_id, body, visitor) on public.community_replies to anon, authenticated;
revoke select, update, delete on public.community_replies from anon, authenticated;
alter table public.community_replies enable row level security;
drop policy if exists "anyone can reply" on public.community_replies;
create policy "anyone can reply" on public.community_replies
  for insert to anon, authenticated
  with check (status = 'pending' and decided is null and at between now() - interval '1 minute' and now() + interval '1 minute');

create or replace function public.community_reply_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from community_posts where id = new.post_id and status = 'approved') then
    raise exception 'post not open' using errcode = '23503';  -- only approved posts take replies
  end if;
  if (select count(*) from community_replies where at > now() - interval '1 hour' and visitor is not distinct from new.visitor) >= 6 then
    raise exception 'too many replies' using errcode = '54000';
  end if;
  if (select count(*) from community_replies where at > now() - interval '1 hour') >= 120 then
    raise exception 'too many replies' using errcode = '54000';
  end if;
  return new;
end $$;
drop trigger if exists community_reply_rate_limit on public.community_replies;
create trigger community_reply_rate_limit before insert on public.community_replies for each row execute function public.community_reply_rate_limit();

-- 3) public lists now carry the number of approved replies
create or replace function public.community_list(only_kind text default null, lim int default 60)
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('id', id, 'at', at, 'kind', kind, 'title', title, 'body', body,
                                             'data', data, 'server', server, 'replies', replies) order by at desc), '[]')
  from (select p.*, (select count(*) from community_replies r where r.post_id = p.id and r.status = 'approved') as replies
        from community_posts p where p.status = 'approved' and (only_kind is null or p.kind = only_kind)
        order by p.at desc limit greatest(1, least(lim, 200))) p;
$$;
grant execute on function public.community_list(text, int) to anon, authenticated;

create or replace function public.community_replies_list(pid bigint)
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('id', id, 'at', at, 'body', body) order by at), '[]')
  from community_replies where post_id = pid and status = 'approved';
$$;
grant execute on function public.community_replies_list(bigint) to anon, authenticated;

-- 4) owner: replies waiting for a decision (with their post's title), approve / reject / delete
create or replace function public.community_admin_replies(only_status text default 'pending', lim int default 200)
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not is_owner() then raise exception 'owner only' using errcode = '42501'; end if;
  return (select coalesce(json_agg(row_to_json(x) order by x.at desc), '[]')
          from (select r.*, p.title as post_title, p.kind as post_kind from community_replies r join community_posts p on p.id = r.post_id
                where only_status is null or r.status = only_status order by r.at desc limit greatest(1, least(lim, 500))) x);
end $$;
grant execute on function public.community_admin_replies(text, int) to authenticated;

create or replace function public.community_reply_set(rid bigint, new_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_owner() then raise exception 'owner only' using errcode = '42501'; end if;
  if new_status = 'delete' then delete from community_replies where id = rid; return; end if;
  update community_replies set status = new_status, decided = now() where id = rid;
end $$;
grant execute on function public.community_reply_set(bigint, text) to authenticated;
