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
--  Migrate function signatures whose return type changed (CREATE OR REPLACE
--  can't change a function's return type, so these must be dropped first).
--  NOTE: this section must NEVER drop data tables — the file is meant to be
--  re-run safely. Dropping public.watched here previously wiped users' watched
--  lists on every re-run; the personal watchlist/watched tables below use
--  CREATE TABLE IF NOT EXISTS and are preserved.
-- --------------------------------------------------------------------------
drop function if exists public.remove_movie(text, bigint);
drop function if exists public.my_groups();
drop function if exists public.group_movies(text);
-- v6: create_group lost its password arg; join_group (password) is retired.
drop function if exists public.create_group(text, text, text, text);
drop function if exists public.join_group(text, text, text);
-- One-time removal of the legacy group-scoped `movies` table (never recreated,
-- holds no current data). The user-scoped `public.watched` is intentionally
-- NOT dropped so re-running this file keeps everyone's watched history.
drop table if exists public.movies cascade;

-- --- group tables ----------------------------------------------------------
-- v6: groups are joined via a shareable invite link, not a password. New
-- installs get a nullable password_hash (legacy/unused) + an invite_token.
create table if not exists public.groups (
  code          text primary key,
  name          text not null,
  password_hash text,
  invite_token  text,
  created_by    uuid references auth.users(id),
  created_at    timestamptz default now()
);

-- Migrate existing installs to the invite-link model.
alter table public.groups alter column password_hash drop not null;
alter table public.groups add column if not exists invite_token text;
update public.groups
   set invite_token = code || '-' || substr(md5(random()::text), 1, 6)
 where invite_token is null;
create unique index if not exists groups_invite_token_idx on public.groups(invite_token);

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

-- v5: personal good/ok/bad verdict on a watched movie (null = not yet rated).
-- Distinct from the TMDB numeric rating; each user edits only their own row
-- (covered by the existing "own watched" RLS policy — no new grant needed).
alter table public.watched   add column if not exists verdict text;

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

-- hide the password hash from clients entirely; invite_token is readable, but
-- RLS still limits which group rows a user can select (members only).
revoke select on public.groups from authenticated;
grant  select (code, name, created_by, created_at, invite_token) on public.groups to authenticated;

-- --------------------------------------------------------------------------
--  RPCs: create / join / list / leave / delete groups
-- --------------------------------------------------------------------------
-- v6: create a group without a password; returns the new group's invite token.
create or replace function public.create_group(
  p_code text, p_name text, p_user_name text)
returns text language plpgsql security definer
set search_path = public, extensions as $$
declare tok text;
begin
  if length(coalesce(p_code,'')) = 0 then return 'invalid'; end if;
  tok := p_code || '-' || substr(md5(random()::text), 1, 6);
  -- Rely on the code primary key for uniqueness rather than a separate
  -- existence check: two concurrent creates of the same code could both pass a
  -- check-then-insert, but only one can win the insert. The loser catches the
  -- unique_violation and reports 'exists', so the race is impossible.
  begin
    insert into public.groups(code, name, invite_token, created_by)
      values (p_code, p_name, tok, auth.uid());
  exception when unique_violation then
    return 'exists';
  end;
  insert into public.group_members(group_code, user_id, user_name)
    values (p_code, auth.uid(), p_user_name);
  return tok;
end; $$;

-- v6: join a group via its invite token; returns the group code (or 'nogroup').
create or replace function public.join_by_token(
  p_token text, p_user_name text)
returns text language plpgsql security definer
set search_path = public, extensions as $$
declare gcode text;
begin
  select code into gcode from public.groups where invite_token = p_token;
  if gcode is null then return 'nogroup'; end if;
  insert into public.group_members(group_code, user_id, user_name)
    values (gcode, auth.uid(), p_user_name)
    on conflict (group_code, user_id) do update set user_name = excluded.user_name;
  return gcode;
end; $$;

-- Groups the caller belongs to: owner flag, member count, and invite token.
create or replace function public.my_groups()
returns table(code text, name text, is_owner boolean, member_count bigint, invite_token text)
language sql security definer stable
set search_path = public as $$
  select g.code,
         g.name,
         g.created_by = auth.uid()                       as is_owner,
         (select count(*) from public.group_members gm
           where gm.group_code = g.code)                 as member_count,
         g.invite_token
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

-- owner-only: remove another member from a group. The target's personal lists
-- are untouched — only their membership row is deleted. The owner can't remove
-- themselves this way (they use leave_group / delete_group instead).
create or replace function public.remove_member(p_code text, p_user uuid)
returns text language plpgsql security definer
set search_path = public as $fn$
declare owner uuid;
begin
  select created_by into owner from public.groups where code = p_code;
  if owner is null       then return 'nogroup';  end if;
  if owner <> auth.uid() then return 'notowner'; end if;
  if p_user = owner      then return 'self';      end if;
  delete from public.group_members where group_code = p_code and user_id = p_user;
  return 'ok';
end;
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

grant execute on function public.create_group(text,text,text)      to authenticated;
grant execute on function public.join_by_token(text,text)          to authenticated;
grant execute on function public.my_groups()                       to authenticated;
grant execute on function public.leave_group(text)                 to authenticated;
grant execute on function public.remove_member(text,uuid)          to authenticated;
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

-- Atomically remove a movie from the caller's watched list AND reset its watch
-- counter. Both deletes run in one function (a single transaction), so a
-- partial failure can't leave an orphaned watch_counts row behind. RLS still
-- applies via auth.uid(); the function only ever touches the caller's own rows.
create or replace function public.remove_from_watched(p_tmdb bigint)
returns void language sql security definer
set search_path = public as $fn$
  delete from public.watched      where user_id = auth.uid() and tmdb_id = p_tmdb;
  delete from public.watch_counts where user_id = auth.uid() and tmdb_id = p_tmdb;
$fn$;

grant execute on function public.remove_from_watched(bigint) to authenticated;

-- Publish so a user's own watch-count changes stream to their open tabs.
do $$
begin
  begin alter publication supabase_realtime add table public.watch_counts; exception when duplicate_object then null; end;
end $$;

-- ==========================================================================
--  v4: USER PROFILES + avatars
--  ------------------------------------------------------------------------
--  A profile per user: display name, short nickname (shown in groups), an
--  optional avatar (uploaded to the `avatars` storage bucket), and a one-line
--  bio. Profiles are readable by any authenticated user (names/avatars are
--  semi-public so they can appear in shared group views), but each user may
--  only edit their own row.
-- ==========================================================================
create table if not exists public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  nickname     text,
  avatar_url   text,
  bio          text,
  updated_at   timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles readable" on public.profiles;
drop policy if exists "own profile write" on public.profiles;

-- Any signed-in user can read profiles (needed to render other members in a
-- group). Only basic display fields live here — nothing sensitive.
create policy "profiles readable" on public.profiles
  for select to authenticated using (true);

-- A user can insert/update/delete only their own profile row.
create policy "own profile write" on public.profiles
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Keep profile changes streaming to the user's own open tabs (top-bar avatar).
do $$
begin
  begin alter publication supabase_realtime add table public.profiles; exception when duplicate_object then null; end;
end $$;

-- --------------------------------------------------------------------------
--  Avatar storage bucket (public read; users write only their own folder).
--  Files are stored under `<user_id>/...`, so the first path segment gates
--  who may write.
-- --------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

drop policy if exists "avatars public read"   on storage.objects;
drop policy if exists "avatars owner write"    on storage.objects;
drop policy if exists "avatars owner update"   on storage.objects;
drop policy if exists "avatars owner delete"   on storage.objects;

create policy "avatars public read" on storage.objects
  for select to public using (bucket_id = 'avatars');

create policy "avatars owner write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- --------------------------------------------------------------------------
--  group_movies v3: join profiles so a group's queued_by / watched_by carry
--  each member's preferred name (nickname → display_name → stored user_name)
--  and avatar. Return type is unchanged (jsonb payloads), so CREATE OR REPLACE
--  is enough.
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
           m.user_id,
           coalesce(nullif(p.nickname, ''), nullif(p.display_name, ''), m.user_name) as pname,
           p.avatar_url,
           'queued'::text as kind
    from public.group_members m
    join public.watchlist w on w.user_id = m.user_id
    left join public.profiles p on p.user_id = m.user_id
    where m.group_code = p_code and public.is_member(p_code)
    union all
    select wd.tmdb_id, wd.title, wd.year, wd.poster, wd.rating, wd.genre,
           m.user_id,
           coalesce(nullif(p.nickname, ''), nullif(p.display_name, ''), m.user_name) as pname,
           p.avatar_url,
           'watched'::text as kind
    from public.group_members m
    join public.watched wd on wd.user_id = m.user_id
    left join public.profiles p on p.user_id = m.user_id
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
      jsonb_agg(distinct jsonb_build_object('user_id', e.user_id, 'name', e.pname, 'avatar_url', e.avatar_url))
        filter (where e.kind = 'queued'), '[]'::jsonb) as queued_by,
    coalesce(
      jsonb_agg(distinct jsonb_build_object('user_id', e.user_id, 'name', e.pname, 'avatar_url', e.avatar_url))
        filter (where e.kind = 'watched'), '[]'::jsonb) as watched_by
  from entries e
  group by e.tmdb_id;
$$;

grant execute on function public.group_movies(text) to authenticated;

-- ==========================================================================
--  v7: RECOMMENDATION ENGINE (pgvector)
--  ------------------------------------------------------------------------
--  One content-based engine feeding two surfaces (Home "Recommended" + the
--  Catch-up onboarding page). Every corpus film carries a multi-hot METADATA
--  vector (genres + top keywords + director/cast), L2-normalized, produced by
--  scripts/build-vectors.mjs. A user's TASTE vector is the weighted mean of
--  their watched films' vectors (Good ≈ +1.0, unrated ≈ +0.4, Bad negative,
--  scaled by rewatch count). Suggestions = cosine nearest-neighbours in the
--  corpus, excluding anything the user has already queued or seen, cached per
--  user in public.suggestions.
--
--  VECTOR LAYOUT — must match scripts/build-vectors.mjs (TOTAL_DIM):
--    genres    19  fixed TMDB genre list        (dims   1.. 19)
--    keywords 300  top keywords by corpus freq  (dims  20..319)
--    people   200  top director/cast by freq    (dims 320..519)
--    TOTAL    519
-- ==========================================================================
create extension if not exists vector;

-- Shared movie catalog + its embeddings. Written only by the service-role batch
-- job (scripts/build-vectors.mjs); read only through the SECURITY DEFINER RPCs
-- below, so the large `embedding` column never ships to a browser.
create table if not exists public.movie_vectors (
  tmdb_id    bigint primary key,
  title      text,
  year       text,
  poster     text,
  rating     numeric,
  genre      text,
  popularity numeric,
  embedding  vector(519),
  updated_at timestamptz default now()
);

create index if not exists movie_vectors_popularity_idx
  on public.movie_vectors(popularity desc);
-- Cosine ANN index. A seq scan is already fine at ~5k rows; this future-proofs
-- a larger corpus. Safe to create on an empty table.
create index if not exists movie_vectors_embedding_idx
  on public.movie_vectors using hnsw (embedding vector_cosine_ops);

-- The explainable vocabulary the batch job assigned dims from (one row per
-- non-genre feature dim). Rebuilt wholesale each run; handy for inspecting why
-- a film was recommended.
create table if not exists public.movie_vector_vocab (
  dim  int primary key,
  kind text not null,   -- 'keyword' | 'person'
  term text not null,
  ref  text             -- TMDB keyword/person id
);

-- Per-user cached recommendations (rebuilt by refresh_suggestions()).
create table if not exists public.suggestions (
  user_id     uuid   not null references auth.users(id) on delete cascade,
  tmdb_id     bigint not null,
  rank        int    not null,
  score       real,
  source      text,   -- 'taste' | 'cold'
  computed_at timestamptz default now(),
  primary key (user_id, tmdb_id)
);
create index if not exists suggestions_user_rank_idx on public.suggestions(user_id, rank);

alter table public.movie_vectors      enable row level security;
alter table public.movie_vector_vocab enable row level security;
alter table public.suggestions        enable row level security;

-- movie_vectors + vocab are a public catalog written only by service-role and
-- read only via the RPCs below → no direct-select policy (locked down). A user
-- may read only their own cached suggestion rows.
drop policy if exists "own suggestions" on public.suggestions;
create policy "own suggestions" on public.suggestions
  for select to authenticated using (user_id = auth.uid());

-- verdict + rewatch count → a single taste weight. Unrated-but-watched still
-- counts as a mild positive; a "bad" verdict pushes the taste vector away.
create or replace function public.taste_weight(p_verdict text, p_count integer)
returns double precision language sql immutable as $$
  select (case p_verdict
            when 'good' then 1.0
            when 'ok'   then 0.5
            when 'bad'  then -0.6
            else 0.4
          end) * greatest(coalesce(p_count, 1), 1);
$$;

-- Recompute + cache the caller's suggestions. Returns how many rows were written.
create or replace function public.refresh_suggestions(p_limit int default 40)
returns int language plpgsql security definer
set search_path = public, extensions as $$
declare
  uid   uuid := auth.uid();
  taste vector(519);
  n     int := 0;
begin
  if uid is null then return 0; end if;

  -- Weighted mean of the caller's watched films that exist in the corpus.
  -- The embedding is parsed from its text form ("[a,b,...]") rather than a
  -- vector→array cast, so this works on any pgvector version.
  with graded as (
    select wd.tmdb_id, public.taste_weight(wd.verdict, wc.count) as weight
    from public.watched wd
    left join public.watch_counts wc
      on wc.user_id = wd.user_id and wc.tmdb_id = wd.tmdb_id
    where wd.user_id = uid
  ),
  dims as (
    select d.dim, sum(d.val * g.weight) as s
    from graded g
    join public.movie_vectors mv on mv.tmdb_id = g.tmdb_id
    cross join lateral unnest(
      string_to_array(trim(both '[]' from mv.embedding::text), ',')::double precision[]
    ) with ordinality as d(val, dim)
    group by d.dim
  )
  select array_agg(s order by dim)::vector into taste from dims;

  delete from public.suggestions where user_id = uid;

  if taste is not null then
    insert into public.suggestions(user_id, tmdb_id, rank, score, source)
    select uid, t.tmdb_id, t.rnk, t.sim, 'taste'
    from (
      select mv.tmdb_id,
             row_number() over (order by mv.embedding <=> taste) as rnk,
             (1 - (mv.embedding <=> taste))::real                as sim
      from public.movie_vectors mv
      where mv.tmdb_id not in (
        select tmdb_id from public.watched  where user_id = uid
        union
        select tmdb_id from public.watchlist where user_id = uid
      )
      order by mv.embedding <=> taste
      limit p_limit
    ) t;
  else
    -- Cold start: most-popular corpus films, floating the caller's watchlist
    -- genres to the front, excluding anything already queued/seen.
    insert into public.suggestions(user_id, tmdb_id, rank, score, source)
    select uid, t.tmdb_id, t.rnk, t.pop, 'cold'
    from (
      select mv.tmdb_id,
             row_number() over (
               order by (mv.genre in (select genre from public.watchlist where user_id = uid)) desc,
                        mv.popularity desc nulls last
             ) as rnk,
             coalesce(mv.popularity, 0)::real as pop
      from public.movie_vectors mv
      where mv.tmdb_id not in (
        select tmdb_id from public.watched  where user_id = uid
        union
        select tmdb_id from public.watchlist where user_id = uid
      )
      order by (mv.genre in (select genre from public.watchlist where user_id = uid)) desc,
               mv.popularity desc nulls last
      limit p_limit
    ) t;
  end if;

  get diagnostics n = row_count;
  return n;
end; $$;

-- Read the caller's cached recommendations joined with display metadata. Auto-
-- computes on a cold cache so the first call always returns something. Only the
-- metadata columns leave the DB — never the embedding.
create or replace function public.recommendations(p_limit int default 24)
returns table(
  tmdb_id bigint, title text, year text, poster text,
  rating numeric, genre text, score real, source text
)
language plpgsql security definer
set search_path = public, extensions as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  if not exists (select 1 from public.suggestions where user_id = uid) then
    perform public.refresh_suggestions(greatest(p_limit, 40));
  end if;
  return query
    select mv.tmdb_id, mv.title, mv.year, mv.poster, mv.rating, mv.genre,
           s.score, s.source
    from public.suggestions s
    join public.movie_vectors mv on mv.tmdb_id = s.tmdb_id
    where s.user_id = uid
    order by s.rank
    limit p_limit;
end; $$;

grant execute on function public.taste_weight(text, integer) to authenticated;
grant execute on function public.refresh_suggestions(int)    to authenticated;
grant execute on function public.recommendations(int)        to authenticated;

-- ==========================================================================
--  v8: WATCHED-TOGETHER (group-scoped)
--  ------------------------------------------------------------------------
--  The group "Watched" tab means films the group actually saw TOGETHER, not a
--  union of members' individual watch histories. This is an explicit, first-
--  class fact: a member marks a film "watched together" from the group view
--  (public.mark_group_watched) and it lands here, group-scoped, with who
--  logged it and when. The Common tab reads the derived pool (group_movies)
--  and simply excludes anything present here.
--
--  Distinct from public.watched (per-user, list-independent). A movie can be
--  on someone's personal watched list without the group having seen it as a
--  group, and vice-versa.
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

-- Any member of the group may read its watched-together rows (also lets the
-- realtime stream deliver them). Writes go only through the RPCs below, which
-- stamp marked_by = auth.uid(), so no direct INSERT/DELETE grant is given.
drop policy if exists "members read group_watched" on public.group_watched;
create policy "members read group_watched" on public.group_watched
  for select to authenticated using (public.is_member(group_code));

-- A group's watched-together films, newest first, each carrying the member who
-- logged it (preferred name + avatar). SECURITY DEFINER, gated on membership.
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

-- Mark (or refresh) a film as watched together by this group. Any member may
-- do it; marked_by/watched_at are stamped from the caller. Denormalizes the
-- movie's display fields so the Watched tab renders without a TMDB round-trip.
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

-- Undo: any member may remove a watched-together entry (it flips back to Common
-- if enough members still want it).
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
