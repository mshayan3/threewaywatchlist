-- ==========================================================================
--  Threeway Watchlist — redesign migration
--  Run this once in Supabase → SQL Editor. Idempotent / safe to re-run.
--
--  Covers:
--    v5  personal good/ok/bad verdict on watched movies
--    v6  invite-link groups (replaces password-based create/join)
--
--  After running this, the app's Groups screen creates groups without a
--  password and joins via a shared invite link (/join/<token>).
-- ==========================================================================

-- ---- v5: personal verdict -------------------------------------------------
alter table public.watched add column if not exists verdict text;
-- (null = not rated; the app writes 'good' | 'ok' | 'bad'. The existing
--  "own watched" RLS policy already lets a user edit only their own row.)

-- ---- v6: invite-link groups ----------------------------------------------
-- Passwords are no longer required.
alter table public.groups alter column password_hash drop not null;

-- Every group gets a stable, shareable invite token.
alter table public.groups add column if not exists invite_token text;

-- Backfill tokens for any pre-existing groups.
update public.groups
   set invite_token = code || '-' || substr(md5(random()::text), 1, 6)
 where invite_token is null;

create unique index if not exists groups_invite_token_idx
  on public.groups(invite_token);

-- Expose invite_token to members (RLS still restricts SELECT to members).
grant select (code, name, created_by, created_at, invite_token)
  on public.groups to authenticated;

-- create_group — no password; returns the new group's invite token.
drop function if exists public.create_group(text, text, text, text);
drop function if exists public.create_group(text, text, text);
create or replace function public.create_group(
  p_code text, p_name text, p_user_name text)
returns text language plpgsql security definer
set search_path = public, extensions as $$
declare tok text;
begin
  if length(coalesce(p_code,'')) = 0 then return 'invalid'; end if;
  if exists (select 1 from public.groups where code = p_code) then
    return 'exists';
  end if;
  tok := p_code || '-' || substr(md5(random()::text), 1, 6);
  insert into public.groups(code, name, invite_token, created_by)
    values (p_code, p_name, tok, auth.uid());
  insert into public.group_members(group_code, user_id, user_name)
    values (p_code, auth.uid(), p_user_name);
  return tok;
end; $$;

-- join_by_token — join via an invite token; returns the group code.
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

-- my_groups — now also returns invite_token (so owners can copy the link).
drop function if exists public.my_groups();
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

grant execute on function public.create_group(text,text,text) to authenticated;
grant execute on function public.join_by_token(text,text)     to authenticated;
grant execute on function public.my_groups()                  to authenticated;

-- Retire the old password-based join RPC (no longer used by the app).
drop function if exists public.join_group(text, text, text);
