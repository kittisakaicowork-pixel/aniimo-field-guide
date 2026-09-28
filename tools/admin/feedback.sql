-- Aniimo Field Guide: user feedback (run once in Supabase → SQL Editor, after supabase.sql)
-- Visitors can only SEND feedback. Only the owner can read, mark or delete it (through the functions below).

create table if not exists public.feedback (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  topic   text not null check (topic in ('idea','bug','data','other')),
  message text not null check (char_length(message) between 3 and 1000),
  contact text check (char_length(contact) <= 100),
  page    text check (char_length(page) <= 40),
  visitor text check (char_length(visitor) <= 40),
  status  text not null default 'new' check (status in ('new','read','done'))
);
create index if not exists feedback_at on public.feedback (at desc);

grant usage on schema public to anon, authenticated;
grant insert (topic, message, contact, page, visitor) on public.feedback to anon, authenticated;
revoke select, update, delete on public.feedback from anon, authenticated;

alter table public.feedback enable row level security;
drop policy if exists "anyone can send feedback" on public.feedback;
create policy "anyone can send feedback" on public.feedback
  for insert to anon, authenticated
  with check (status = 'new' and at between now() - interval '1 minute' and now() + interval '1 minute');

create or replace function public.feedback_list(lim int default 100, only_status text default null)
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not is_owner() then raise exception 'owner only' using errcode = '42501'; end if;
  return (select coalesce(json_agg(row_to_json(f) order by f.at desc), '[]')
          from (select id, at, topic, message, contact, page, status from feedback
                where only_status is null or status = only_status
                order by at desc limit greatest(1, least(lim, 500))) f);
end $$;

create or replace function public.feedback_set(fid bigint, new_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_owner() then raise exception 'owner only' using errcode = '42501'; end if;
  if new_status = 'delete' then
    delete from feedback where id = fid;
  elsif new_status in ('new','read','done') then
    update feedback set status = new_status where id = fid;
  end if;
end $$;

revoke all on function public.feedback_list(int, text) from public, anon;
revoke all on function public.feedback_set(bigint, text) from public, anon;
grant execute on function public.feedback_list(int, text) to authenticated;
grant execute on function public.feedback_set(bigint, text) to authenticated;
