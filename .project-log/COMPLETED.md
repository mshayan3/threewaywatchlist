# Completed Tasks

_Newest first._

## 2026-08-03 18:16 (PKT) — Ran the vectorizer; made build-vectors.mjs SDK-free
Kicked off the corpus batch job with the user's service-role key (passed inline via env, never written to disk). First run failed instantly: this machine is on **Node v20.13.1**, and `@supabase/supabase-js` v2.45 constructs a realtime WebSocket client in its constructor that requires Node 22+ (`native WebSocket not found`). Fixed by dropping the SDK from the script entirely — it now talks to **PostgREST directly over `fetch`** (tiny `dbSelect/dbInsert/dbUpsert/dbDelete` helpers, service-role headers), which the batch job's simple reads/writes never needed the SDK for. Also added a **preflight** that probes `movie_vectors` up front and fails fast with a "re-run schema.sql" hint instead of crawling ~5k films first. Re-ran to success: **3,841 films written to `movie_vectors`** (corpus of 3,859 unique = TMDB top-rated ∪ popular ∪ user-list films; 18 dropped for no usable features), vocabulary at both caps (300 keywords / 200 people). The clean upserts confirm the pgvector embedding format + schema v7 are correct live. The preflight passing also confirms the schema was re-run. Remaining: signed-in verification of the actual recommendations (needs a user session).

## 2026-08-03 18:07 (PKT) — Built the recommendation engine (pgvector) — all 5 Soon steps
Implemented the locked content-based recommender end to end: one pgvector engine feeding two surfaces (Home + Catch up), server-computed and cached.
- **1. schema.sql (v7)** — `create extension vector`; new `movie_vectors` (tmdb_id + metadata + `vector(519)` embedding, HNSW cosine index + popularity index), `movie_vector_vocab` (explainable dim→term map), and per-user `suggestions` cache. RLS: catalog tables locked down (read only via RPCs), `suggestions` readable only by owner.
- **3. Compute RPCs** — `taste_weight(verdict,count)` (Good +1.0 / ok +0.5 / unrated +0.4 / Bad −0.6, × rewatch); `refresh_suggestions(limit)` builds the weighted taste centroid (weighted mean of the user's watched films' vectors, computed in-DB via a text-parse unnest so it works on any pgvector version), then cosine-NN (`<=>`) over the corpus excluding queued/seen → cache; cold-start branch = popularity, watchlist-genres floated up. `recommendations(limit)` reads the cache joined to metadata and auto-computes on a cold cache. Embeddings never leave the DB.
- **2. Batch script** — `scripts/build-vectors.mjs` (+ `npm run build:vectors`): assembles TMDB top-rated ∪ popular ∪ every user-list film (~5k), fetches each with `append_to_response=keywords,credits`, builds the vocabulary (19 fixed genres + top 300 keywords + top 200 director/cast by corpus frequency), emits multi-hot **L2-normalized** vectors (sent as pgvector text form), and upserts `movie_vectors` + rewrites `movie_vector_vocab`. Needs `SUPABASE_SERVICE_ROLE_KEY` (documented in `.env.local.example`, pass inline — never committed).
- **4. Home** — new `useSuggestions` hook; the "Recommended" deck now reads the `recommendations` cache (filtered against the live watchlist/watched) instead of echoing the watchlist, with actions **Add to watchlist / Seen it / Not now**, a source-aware hint ("picked from your taste" vs "popular picks"), a Refresh action, and a bigger hero poster. Gracefully falls back to the old watchlist-echo deck until the corpus exists.
- **5. Catch up** — new `/catch-up` route + `CatchUp.tsx`: Letterboxd-style onboarding (featured card + horizontal filmstrip) that triages suggestions into watchlist/watched/skip, on the same cache (cold-starts to popularity). Added a "Catch up" nav item (sparkles icon) to the sidebar + mobile tabs, `titleForPath`, and `/catch-up` to the middleware's protected routes.
- **Verified:** `tsc` clean on all new/edited files (only the pre-existing Supabase `@types` errors remain); `/catch-up` compiles and 307-redirects to `/login` while signed out (route + imports + middleware all good, no 500). Live recommendations remain unverified pending the two user-side steps below.

## 2026-08-03 17:54 (PKT) — Ran schema.sql in Supabase; invite links verified working
User re-ran the full `schema.sql` in Supabase → SQL Editor (applying the invite-link RPCs `create_group`→token / `join_by_token` / `my_groups`→`invite_token`, plus `remove_from_watched` and `remove_member`) and confirmed the invite links work end to end — create → copy link → `/join/<token>` → joined. The invite-link feature (task #1) is now fully shipped and live.

## 2026-08-03 17:50 (PKT) — Swapped both color themes (Obsidian dark + Clean White light)
Reworked the two palettes in `src/app/globals.css` after reviewing theme options.
- **Dark → "Obsidian"** — neutral near-black, darker than the prior `#0e1013` cool-gray scheme: page `#060708`, frame `#101217`, bar `#16181d`, surface `#1a1d23`, borders `#24272e`. Kept the light-ink primary (`#e8eaee`), blue links (`#5b9dff`), and green/amber/red verdicts. Remains the boot-default theme.
- **Light → "Clean White"** — crisp white surfaces (`#ffffff`) on a soft off-white page (`#f7f7f8`), hairline borders `#ececee`, dark-ink primary `#111318` on white text, blue links `#2f6fe0`.
- Verdict colors, fonts, and radii untouched, so the rest of the UI stays consistent. Verified live via computed CSS tokens on the running dev server (both themes resolve correctly, no console errors); no screenshot (Browser pane not displayed).

## 2026-08-03 17:48 (PKT) — Surfaced the group invite link inside the group detail view
Closed the "no link available to share for joining a group" gap. The invite-link flow already existed on the Groups list (`GroupsPanel`: create shows the link, per-card "Copy invite link", paste-to-join) and in the backend (`create_group` returns a token, `join_by_token`, `my_groups` exposes `invite_token`, `/join/[token]` landing page) — but the **group detail page** offered no way to grab it.
- **`GroupView`** — added a "Copy invite link" item to the group menu (shown to any member whenever `group.inviteToken` is set — anyone with the link can join). Copies `inviteUrl(token)` to the clipboard with a toast, falling back gracefully if the clipboard API is blocked.
- **`useGroupDetail`** — the resolve query now selects `invite_token` and threads it onto the `group` object (previously it fetched only `name, created_by`, so `GroupView` never received the token).
- **`helpers.ts`** — extracted the `inviteUrl(token)` builder here; `GroupsPanel` now imports it instead of keeping its own copy (DRY).
- Typechecks clean on all four touched files (only the pre-existing Supabase `@types` errors remain). Not verified in-app — the group view sits behind login and I won't enter credentials.

## 2026-08-03 13:26 (PKT) — Redesigned Home into two-column Recommended + Queue layout
Rebuilt `Home.tsx` to match a supplied target screenshot: a two-column desktop layout (stacks on mobile).
- **Left — "Recommended from your watchlist"** — the existing hero deck (poster + Mark watched / Not now / Remove), but the title now sits beside the poster in large display type instead of overlaying it. Poster carries a TMDB rating badge (amber star, dark pill, top-right); gradient fallbacks center the title.
- **Right — "In your queue"** — new scrollable list (`QueueRow`) of the rest of the watchlist, each row a bordered surface card: small poster thumb · title · year·genre · amber-star `RatingChip`. Clicking a row features that title as the recommendation (sets the deck cursor). Header has a "View all →" link to `/watchlist`.
- New shared pieces: `SectionHead` (title + hint + optional action link), `StarIcon`, `RatingChip`. Stats strip and empty state unchanged.
- Typechecks clean (only pre-existing Supabase `@types` errors remain). Not rendered in-app — `/home` sits behind login and I won't enter credentials.

## 2026-08-03 — Unified Watchlist + Watched design chrome
Made the Watchlist page adopt the same layout as the Watched page (per a supplied screenshot).
- **New `ListChrome.tsx`** — shared `StatBlock` (bordered "N films · Top genre" strip), `ViewToggle` (grid/list segmented switch, active = light `--accent` pill), and `FilterChip` (active "All" = solid light pill; active colored chips stay tinted). Extracted from the previously view-local helpers.
- **`WatchedView`** — now uses the shared chrome; verdict filter chips show full words ("Good 5 / Okay 2 / Bad 1") instead of single letters (G/O/B) to match the screenshot. Removed its local `Stat`/`FilterChip`.
- **`WatchlistView`** — rebuilt to mirror Watched: title, stats strip (film count + top genre), Sort dropdown + grid/list toggle, and a new list view (`WatchlistRow`: thumb · title/meta · Mark-watched · remove). Grid view unchanged (shared `PersonalMovieCard`).
- Typechecks clean in the touched files (pre-existing Supabase `tsc` errors remain). Not verified in-app: both pages sit behind login.

## 2026-08-03 18:12 (PKT) — Imported Letterboxd history into muhammad.shayan101@gmail.com
Bulk-imported the user's Letterboxd export (`watched.csv` + `watchlist.csv`) into their account.
- **Resolution** — a scratchpad Node script (`resolve.mjs`) matched all 267 CSV rows to TMDB movies via the search API (title + `primary_release_year`, then a title/year/popularity scoring pick), capturing tmdb_id, poster_path, rating, and genre. 263 matched cleanly; year-diff flags (Kingsman 2015, Life of Chuck 2025, Stuck in Love 2013, etc.) were all correct TMDB release-year quirks.
- **Skipped** — *The Queen's Gambit* and *Senna (2024)* are Netflix TV series with no faithful TMDB movie (search only found making-of docs); user chose to skip both.
- **Write** — `import.mjs` looked up the `user_id` via the Auth admin API and upserted **195 watched + 70 watchlist** rows (RLS bypassed with the service_role key), preserving each row's Letterboxd log date as `watched_at`/`added_at` and setting `watch_counts` = 1 for watched titles (ignore-duplicates so existing counts survive).
- Verified via PostgREST count: watched 196, watchlist 71, watch_counts 196 (each had 1 pre-existing row). Service key was passed only as an env var — never written to disk.

## 2026-08-03 17:57 (PKT) — UI pass: grid density, inline sidebar search, Home uniformity, Watched sort
Implemented the five "Now" UI tasks:
- **6-per-row grid** — `MovieGrid` now `grid-cols-3 sm:grid-cols-4 lg:grid-cols-6` with tighter gaps (was 2/3/4), so posters read as compact cards. Applies to Watchlist, Watched, and group views.
- **Inline sidebar search** — new `SidebarSearch` component (owns its own `usePersonalLists` instance) replaces the `/search` link in the desktop sidebar; searching + Add now happen inline via a dropdown. `SearchBar` gained a `compact` prop. Mobile keeps the `/search` tab.
- **Wider left panel** — sidebar `w-[248px]` → `w-[288px]`.
- **Home uniformity** — KPI tiles capped at `max-w-[560px]`, tighter padding + uniform `min-h`/font sizes; hero row capped at `max-w-[620px]` and action buttons slimmed `h-12` → `h-11` so they no longer stretch full-width.
- **Watched sort** — removed the month-grouping sections; added a `SortMenu` (Newest / Rating / A–Z) beside the grid/list toggle; verdict filter + grid/list toggle retained.
- Verified: `tsc` clean on all changed files; all 5 app routes compile (307 redirects, no 500s). Signed-in visual check still pending.

## 2026-08-03 17:42 (PKT) — Added TMDB_TOKEN; movie search working locally
Added the TMDB v4 "API Read Access Token" to `.env.local`. Verified: token returns 200 from TMDB directly, and the app's `/api/tmdb?q=interstellar` proxy returns 20 live results (dev server auto-reloaded the env file).

## 2026-08-03 17:29 (PKT) — Implemented Upcoming "Now" + "Soon" tasks
Batch of fixes across the redesigned codebase:
- **Realtime race** — `usePersonalLists` + `useGroupDetail` now re-sync (`reload()`) on the channel's `SUBSCRIBED` status, closing the window between initial load and the subscription connecting.
- **Atomic watched-removal** — new `remove_from_watched(p_tmdb)` RPC deletes from `watched` + `watch_counts` in one transaction; client calls it instead of two separate deletes.
- **Race-safe `create_group`** — dropped the check-then-insert; now relies on the `code` PK and catches `unique_violation` → `'exists'`.
- **"No results" state** — `SearchBar` shows "No matches — try a different title." when a search returns empty instead of silently closing.
- **Kick member** — new owner-only `remove_member(p_code, p_user)` RPC + a Members panel in `GroupView` (toggled from the group menu) with per-member Remove buttons for owners.
- **TMDB 401** — details-by-id branch of `/api/tmdb` now distinguishes a bad server token (500) like the search branch already did.
- _Not done: `TMDB_TOKEN` (needs the user's own token); auth loading-state + TMDB-429 were already handled by the redesign._
- ⚠️ Requires re-running `schema.sql` in Supabase → SQL Editor for the 3 new/changed RPCs.

## 2026-08-03 17:20 (PKT) — Fixed realtime "postgres_changes after subscribe()" crash on Groups tab
Root cause: React Strict Mode double-mounts effects in dev, and `supabase.channel(topic)` returns a cached, already-subscribed channel by topic name — so the second `.on()` threw. Added a random nonce suffix to the channel topic in all three realtime hooks (`useAuthUser.ts`, `useGroupDetail.ts`, `usePersonalLists.ts`) so every mount gets a fresh, unsubscribed channel.

## 2026-08-03 17:20 (PKT) — Set up local Supabase env (.env.local)
Created `.env.local` from the example template with the Supabase publishable/anon key so the app runs locally. `TMDB_TOKEN` still left blank.

## 2026-08-03 17:20 (PKT) — Project tracking started
