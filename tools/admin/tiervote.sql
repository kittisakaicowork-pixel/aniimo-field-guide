-- Aniimo Field Guide: community tier-list votes (run once in Supabase → SQL Editor)
-- One vote per browser per Aniimo (changeable). Visitors cannot read individual votes, only totals.

create table if not exists public.tier_votes (
  visitor text not null check (char_length(visitor) between 8 and 40),
  slug    text not null check (char_length(slug) between 1 and 40),
  tier    text not null check (tier in ('S','A','B','C','D')),
  at      timestamptz not null default now(),
  primary key (visitor, slug)
);
alter table public.tier_votes enable row level security;
revoke all on public.tier_votes from anon, authenticated;

-- cast, change (p_tier = S..D) or withdraw (p_tier = null) a vote
create or replace function public.tier_vote(p_visitor text, p_slug text, p_tier text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_tier is null then
    delete from tier_votes where visitor = p_visitor and slug = p_slug;
  else
    insert into tier_votes (visitor, slug, tier) values (p_visitor, p_slug, p_tier)
    on conflict (visitor, slug) do update set tier = excluded.tier, at = now();
  end if;
end $$;

-- public totals per Aniimo: {"slug": {"S":n,"A":n,"B":n,"C":n,"D":n,"n":total}}
create or replace function public.tier_results()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_object_agg(slug, r), '{}') from (
    select slug, json_build_object(
      'S', count(*) filter (where tier = 'S'), 'A', count(*) filter (where tier = 'A'),
      'B', count(*) filter (where tier = 'B'), 'C', count(*) filter (where tier = 'C'),
      'D', count(*) filter (where tier = 'D'), 'n', count(*)) r
    from tier_votes group by slug) x
$$;

revoke all on function public.tier_vote(text, text, text) from public;
revoke all on function public.tier_results() from public;
grant execute on function public.tier_vote(text, text, text) to anon, authenticated;
grant execute on function public.tier_results() to anon, authenticated;
