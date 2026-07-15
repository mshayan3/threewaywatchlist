-- ==========================================================================
--  Threeway Watchlist — database schema (v2: personal watchlists)
--  Run this whole file in Supabase -> SQL Editor.
--  Safe to re-run: it drops old policies/objects and recreates everything.
--
--  ARCHITECTURE
--  ------------
--  Watchlists are now owned by USERS, not groups.
--    * public.watchlist  — each user's personal "to watch" list.
--    * public.watched    — each user's personal "already seen" list.
--  A group no longer stores its own movies. A group's "common watchlist" is
--  DERIVED on demand from the personal lists of its current members
--  (public.group_movies), and excludes anything ANY member has watched.
-- ==========================================================================

create extension if not exists pgcrypto;

-- --------------------------------------------------------------------------
--  Drop the old group-scoped model (fresh start — no data migration).
-- --------------------------------------------------------------------------
drop function if exists public.remove_movie(text, bigint);
-- my_groups gains is_owner + member_count columns; its return type changes, so it
-- must be dropped (CREATE OR REPLACE can't change a function's return type).
drop function if exists public.my_groups();
-- group_movies gains rating + genre columns; return type change → must drop.
drop function if exists public.group_movies(text);
drop table if exists public.watched cascade;
drop table if exists public.movies  cascade;

-- --- group tables (unchanged) ----------------------------------------------
create table if not exists public.groups (
  code          text primary key,
  name          text not null,
  password_hash text not null,
  created_by    uuid references auth.users(id),
  created_at    timestamptz default now()
);

create table if not exists public.group_members (
  group_code text references public.groups(code) on delete cascade,
  user_id    uuid references auth.users(id),
  user_name  text,
  joined_at  timestamptz default now(),
  primary key (group_code, user_id)
);

-- --- personal, user-scoped tables ------------------------------------------
-- Each row belongs to exactly one user. There is no group_code: a movie a user
-- adds is theirs everywhere, and surfaces in every group they belong to.
create table if not exists public.watchlist (
  user_id   uuid   not null references auth.users(id) on delete cascade,
  tmdb_id   bigint not null,
  title     text   not null,
  year      text,
  poster    text,
  rating    numeric,
  genre     text,
  added_at  timestamptz default now(),
  primary key (user_id, tmdb_id)
);

create table if not exists public.watched (
  user_id    uuid   not null references auth.users(id) on delete cascade,
  tmdb_id    bigint not null,
  title      text   not null,
  year       text,
  poster     text,
  rating     numeric,
  genre      text,
  watched_at timestamptz default now(),
  primary key (user_id, tmdb_id)
);

-- v2.1: add rating + genre to existing installs (no-op if already present).
alter table public.watchlist add column if not exists rating numeric;
alter table public.watchlist add column if not exists genre  text;
alter table public.watched   add column if not exists rating numeric;
alter table public.watched   add column if not exists genre  text;

-- Speeds up the per-member fan-out in public.group_movies.
create index if not exists watchlist_user_idx on public.watchlist(user_id);
create index if not exists watched_user_idx    on public.watched(user_id);

-- --- membership helper (avoids RLS recursion) ------------------------------
create or replace function public.is_member(p_group text)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.group_members
    where group_code = p_group and user_id = auth.uid()
  );
$$;

-- --------------------------------------------------------------------------
--  RLS
--  ---
--  Personal lists are strictly private: a user only ever sees/edits their own
--  rows. Cross-member visibility for a group happens ONLY through the
--  SECURITY DEFINER function public.group_movies, which returns just the
--  derived, filtered set — never another member's raw list.
-- --------------------------------------------------------------------------
alter table public.groups         enable row level security;
alter table public.group_members  enable row level security;
alter table public.watchlist      enable row level security;
alter table public.watched        enable row level security;

-- clean slate (drop any earlier policies)
drop policy if exists "authed all - movies"    on public.groups;
drop policy if exists "members read groups"     on public.groups;
drop policy if exists "members read members"    on public.group_members;
drop policy if exists "members rw movies"       on public.groups;
drop policy if exists "own watchlist"           on public.watchlist;
drop policy if exists "own watched"             on public.watched;

create policy "members read groups" on public.groups
  for select to authenticated using (public.is_member(code));

create policy "members read members" on public.group_members
  for select to authenticated using (public.is_member(group_code));

-- Personal lists: full CRUD, but only over your own rows.
create policy "own watchlist" on public.watchlist
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own watched" on public.watched
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- hide the password hash from clients entirely
revoke select on public.groups from authenticated;
grant  select (code, name, created_by, created_at) on public.groups to authenticated;

-- --------------------------------------------------------------------------
--  RPCs: create / join / list / leave / delete groups
-- --------------------------------------------------------------------------
create or replace function public.create_group(
  p_code text, p_name text, p_password text, p_user_name text)
returns text language plpgsql security definer
set search_path = public, extensions as $$
begin
  if length(coalesce(p_code,'')) = 0 or length(coalesce(p_password,'')) = 0 then
    return 'invalid';
  end if;
  if exists (select 1 from public.groups where code = p_code) then
    return 'exists';
  end if;
  insert into public.groups(code, name, password_hash, created_by)
    values (p_code, p_name, crypt(p_password, gen_salt('bf')), auth.uid());
  insert into public.group_members(group_code, user_id, user_name)
    values (p_code, auth.uid(), p_user_name);
  return 'ok';
end; $$;

create or replace function public.join_group(
  p_code text, p_password text, p_user_name text)
returns text language plpgsql security definer
set search_path = public, extensions as $$
declare gh text;
begin
  select password_hash into gh from public.groups where code = p_code;
  if gh is null then return 'nogroup'; end if;
  if gh <> crypt(p_password, gh) then return 'badpw'; end if;
  insert into public.group_members(group_code, user_id, user_name)
    values (p_code, auth.uid(), p_user_name)
    on conflict (group_code, user_id) do update set user_name = excluded.user_name;
  return 'ok';
end; $$;

-- Groups the caller belongs to, with owner flag + member count for the dashboard.
create or replace function public.my_groups()
returns table(code text, name text, is_owner boolean, member_count bigint)
language sql security definer stable
set search_path = public as $$
  select g.code,
         g.name,
         g.created_by = auth.uid()                       as is_owner,
         (select count(*) from public.group_members gm
           where gm.group_code = g.code)                 as member_count
  from public.groups g
  join public.group_members m on m.group_code = g.code
  where m.user_id = auth.uid()
  order by g.name;
$$;

-- any member can leave a group (personal lists are untouched — they're theirs)
create or replace function public.leave_group(p_code text)
returns void language sql security definer
set search_path = public as $fn$
  delete from public.group_members where group_code = p_code and user_id = auth.uid();
$fn$;

-- only the creator can delete a whole group. Members' personal lists survive;
-- only the group + its membership rows are removed.
create or replace function public.delete_group(p_code text)
returns text language plpgsql security definer
set search_path = public as $fn$
declare owner uuid;
begin
  select created_by into owner from public.groups where code = p_code;
  if owner is null then return 'nogroup'; end if;
  if owner <> auth.uid() then return 'notowner'; end if;
  delete from public.group_members where group_code = p_code;
  delete from public.groups        where code = p_code;
  return 'ok';
end;
$fn$;

-- --------------------------------------------------------------------------
--  RPC: a group's DERIVED combined movie list.
--
--  Pools every current member's personal watchlist + watched entries, then
--  returns one row per movie with:
--    queued_by  — members who have it on their personal watchlist
--    watched_by — members who have marked it watched
--  The client treats a movie as part of the "common watchlist" only when
--  watched_by is empty (i.e. NObody in the group has seen it).
--
--  SECURITY DEFINER so it can read across members' private rows, but it is
--  gated on membership and only ever exposes this aggregated shape.
-- --------------------------------------------------------------------------
create or replace function public.group_movies(p_code text)
returns table(
  tmdb_id    bigint,
  title      text,
  year       text,
  poster     text,
  rating     numeric,
  genre      text,
  queued_by  jsonb,
  watched_by jsonb
)
language sql security definer stable
set search_path = public as $$
  with entries as (
    select w.tmdb_id, w.title, w.year, w.poster, w.rating, w.genre,
           m.user_id, m.user_name, 'queued'::text as kind
    from public.group_members m
    join public.watchlist w on w.user_id = m.user_id
    where m.group_code = p_code and public.is_member(p_code)
    union all
    select wd.tmdb_id, wd.title, wd.year, wd.poster, wd.rating, wd.genre,
           m.user_id, m.user_name, 'watched'::text as kind
    from public.group_members m
    join public.watched wd on wd.user_id = m.user_id
    where m.group_code = p_code and public.is_member(p_code)
  )
  select
    e.tmdb_id,
    (array_agg(e.title  order by e.title))[1]  as title,
    (array_agg(e.year   order by e.year))[1]   as year,
    (array_agg(e.poster order by e.poster))[1] as poster,
    max(e.rating)                              as rating,
    (array_agg(e.genre  order by e.genre))[1]  as genre,
    coalesce(
      jsonb_agg(distinct jsonb_build_object('user_id', e.user_id, 'name', e.user_name))
        filter (where e.kind = 'queued'), '[]'::jsonb) as queued_by,
    coalesce(
      jsonb_agg(distinct jsonb_build_object('user_id', e.user_id, 'name', e.user_name))
        filter (where e.kind = 'watched'), '[]'::jsonb) as watched_by
  from entries e
  group by e.tmdb_id;
$$;

grant execute on function public.create_group(text,text,text,text) to authenticated;
grant execute on function public.join_group(text,text,text)        to authenticated;
grant execute on function public.my_groups()                       to authenticated;
grant execute on function public.leave_group(text)                 to authenticated;
grant execute on function public.delete_group(text)                to authenticated;
grant execute on function public.group_movies(text)                to authenticated;

-- --------------------------------------------------------------------------
--  Realtime
--  --------
--  Personal tables are published so a user's own dashboard updates live (RLS
--  means each client only receives events for its own rows). group_members is
--  published so a group view can react to joins/leaves. Cross-member watchlist
--  changes are picked up by the group view's refresh-on-focus / poll, since
--  RLS (correctly) hides other members' raw rows from realtime.
-- --------------------------------------------------------------------------
do $$
begin
  begin alter publication supabase_realtime add table public.watchlist;     exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.watched;       exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.group_members; exception when duplicate_object then null; end;
end $$;

-- ==========================================================================
--  v3: per-user WATCH COUNT
--  ------------------------------------------------------------------------
--  How many times a given user has watched a given movie. This is a durable,
--  list-independent counter: it survives a movie moving between the watchlist
--  and watched tables, so "put a watched movie back on the watchlist and watch
--  it again" bumps the count rather than resetting it.
--
--    count = 0  → user has never watched it (badge hidden on the client)
--    count = 1  → watched once
--    count = 2+ → rewatched
--
--  The counter is incremented only when a movie is marked watched (see the
--  increment_watch_count RPC), never when it is merely queued or moved back.
-- ==========================================================================
create table if not exists public.watch_counts (
  user_id uuid   not null references auth.users(id) on delete cascade,
  tmdb_id bigint not null,
  count   integer not null default 0,
  primary key (user_id, tmdb_id)
);

create index if not exists watch_counts_user_idx on public.watch_counts(user_id);

alter table public.watch_counts enable row level security;

drop policy if exists "own watch_counts" on public.watch_counts;
create policy "own watch_counts" on public.watch_counts
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Atomically bump the caller's watch count for a movie and return the new value.
-- Called right after a movie is upserted into public.watched.
create or replace function public.increment_watch_count(p_tmdb bigint)
returns integer language plpgsql security definer
set search_path = public as $$
declare new_count integer;
begin
  insert into public.watch_counts(user_id, tmdb_id, count)
    values (auth.uid(), p_tmdb, 1)
  on conflict (user_id, tmdb_id)
    do update set count = public.watch_counts.count + 1
  returning count into new_count;
  return new_count;
end; $$;

grant execute on function public.increment_watch_count(bigint) to authenticated;

-- Note: resetting a watch count (on removal from the watched list) is a plain
-- delete of the row from the client, guarded by RLS — no RPC needed.

-- Publish so a user's own watch-count changes stream to their open tabs.
do $$
begin
  begin alter publication supabase_realtime add table public.watch_counts; exception when duplicate_object then null; end;
end $$;
