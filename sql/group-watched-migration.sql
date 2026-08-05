-- ==========================================================================
--  Threeway Watchlist — v8: watched-together (group-scoped)
--  Run this once in Supabase → SQL Editor. Idempotent / safe to re-run.
--
--  Adds an explicit "watched together" fact for groups. The group Watched tab
--  now means films the group actually saw TOGETHER (a member marks them from
--  the group view) rather than a union of members' individual watch histories.
--  The Common tab reads the derived pool and excludes anything logged here.
--
--  Depends on public.is_member (already present since v6/redesign).
-- ==========================================================================
create table if not exists public.group_watched (
  group_code text   not null references public.groups(code) on delete cascade,
  tmdb_id    bigint not null,
  title      text   not null,
  year       text,
  poster     text,
  rating     numeric,
  genre      text,
  marked_by  uuid references auth.users(id) on delete set null,
  watched_at timestamptz default now(),
  primary key (group_code, tmdb_id)
);

create index if not exists group_watched_code_idx on public.group_watched(group_code);

alter table public.group_watched enable row level security;

-- Members may read their group's watched-together rows (also lets realtime
-- deliver them). Writes go only through the RPCs below.
drop policy if exists "members read group_watched" on public.group_watched;
create policy "members read group_watched" on public.group_watched
  for select to authenticated using (public.is_member(group_code));

-- A group's watched-together films, newest first, each with who logged it.
create or replace function public.group_watched_movies(p_code text)
returns table(
  tmdb_id    bigint,
  title      text,
  year       text,
  poster     text,
  rating     numeric,
  genre      text,
  watched_at timestamptz,
  marked_by  jsonb
)
language sql security definer stable
set search_path = public as $$
  select gw.tmdb_id, gw.title, gw.year, gw.poster, gw.rating, gw.genre, gw.watched_at,
         case when gw.marked_by is null then null else
           jsonb_build_object(
             'user_id', gw.marked_by,
             'name', coalesce(nullif(p.nickname, ''), nullif(p.display_name, ''), gm.user_name),
             'avatar_url', p.avatar_url)
         end as marked_by
  from public.group_watched gw
  left join public.profiles p on p.user_id = gw.marked_by
  left join public.group_members gm
         on gm.group_code = gw.group_code and gm.user_id = gw.marked_by
  where gw.group_code = p_code and public.is_member(p_code)
  order by gw.watched_at desc;
$$;

-- Mark (or refresh) a film as watched together by this group.
create or replace function public.mark_group_watched(
  p_code text, p_tmdb bigint, p_title text, p_year text,
  p_poster text, p_rating numeric, p_genre text)
returns text language plpgsql security definer
set search_path = public as $fn$
begin
  if not public.is_member(p_code) then return 'notmember'; end if;
  insert into public.group_watched(
    group_code, tmdb_id, title, year, poster, rating, genre, marked_by, watched_at)
    values (p_code, p_tmdb, p_title, p_year, p_poster, p_rating, p_genre, auth.uid(), now())
  on conflict (group_code, tmdb_id)
    do update set marked_by = auth.uid(), watched_at = now();
  return 'ok';
end; $fn$;

-- Undo: any member may remove a watched-together entry.
create or replace function public.unmark_group_watched(p_code text, p_tmdb bigint)
returns text language plpgsql security definer
set search_path = public as $fn$
begin
  if not public.is_member(p_code) then return 'notmember'; end if;
  delete from public.group_watched where group_code = p_code and tmdb_id = p_tmdb;
  return 'ok';
end; $fn$;

grant execute on function public.group_watched_movies(text)                            to authenticated;
grant execute on function public.mark_group_watched(text,bigint,text,text,text,numeric,text) to authenticated;
grant execute on function public.unmark_group_watched(text,bigint)                     to authenticated;

-- Publish so the Watched tab updates live for every member of the group.
do $$
begin
  begin alter publication supabase_realtime add table public.group_watched; exception when duplicate_object then null; end;
end $$;
