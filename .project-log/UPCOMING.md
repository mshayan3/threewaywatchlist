# Upcoming Tasks

_Triaged: do the top items first. The full engineering backlog lives in [TODO.md](../TODO.md); this file tracks the near-term priorities._

## 🔴 Now (blocking / next up)
- [ ] **Run `sql/group-watched-migration.sql` in Supabase** — required before the group Watched tab (watched-together) works; adds `group_watched` + its RPCs.
- [ ] Verify signed in (needs your login): group Common = 2+ members, "We watched this together" → Watched tab (who + date + Undo), realtime across members, and the reworked header (⋯ on the right, members expand under the name)
- [ ] Verify signed in (needs your login): kick-member panel, atomic watched-removal, "no results" state, 6-per-row grid, inline sidebar search, compact Home, Watched sort
      _(schema.sql re-run ✓ 2026-08-03; invite link ✓ verified working end to end)_

## 🟡 Soon — Recommendation engine (LIVE ✅ 2026-08-03 — verify + tend)
Built + activated: schema v7 + compute RPCs + `scripts/build-vectors.mjs` (fetch/PostgREST, SDK-free) + Catch-up UI. Catalog holds **3,841 films**. _(As of 2026-08-04 the deck lives ONLY on `/catch-up` — Home is now a public discover surface; `Home.tsx` retired.)_
- [ ] **Verify signed in:** `/catch-up` triage + filmstrip (taste vs cold-start), Add-to-watchlist / Seen-it.
- [ ] **Monthly:** re-run `SUPABASE_SERVICE_ROLE_KEY=<key> npm run build:vectors` to refresh the corpus (consider a cron/GitHub Action so it's not manual).
- [ ] _Optional:_ corpus came out 3,841 (top-rated ∪ popular overlap), under the ~5k target — bump `TARGET_CORPUS`/pages in `build-vectors.mjs` if a wider catalog is wanted.

## 🟡 Soon — Performance / snappiness (why Letterboxd feels faster — diagnosed 2026-08-05)
_Root cause: every page is client-rendered with a spinner→fetch waterfall and TMDB calls are uncached, vs Letterboxd's edge-cached server-rendered HTML. Ordered by leverage._
- [x] **Cache TMDB fetches** ✅ 2026-08-05 — `next: { revalidate }` on every fetch (details `86400`, discover `3600`).
- [x] **Swap raw `<img>` → `next/image`** ✅ 2026-08-05 — all TMDB posters/backdrops/photos; avatars left as raw `<img>` (variable hosts).
- [x] **Prefetch detail data on hover** ✅ 2026-08-05 — `prefetchMovie/PersonDetail` warm the Data Cache on `onMouseEnter`.

## 🟡 Soon — Feature enhancements (requested 2026-08-03)
- [x] **"Who has this?" on common watchlist** ✅ 2026-08-05 — avatar-row `WhoHasRow` on the Common tab (design decision: avatar row).
- [x] **Filter-by in watchlist** ✅ 2026-08-05 — genre filter chips.
- [x] **Filter-by in groups** ✅ 2026-08-05 — per-tab genre filter chips.
- [x] **Top 2 genres per movie** ✅ 2026-08-05 — `firstGenres` returns up to two, comma-joined.

## 🟢 Later / nice-to-have
- [ ] **Server-render public detail pages** _(deferred from the Perf tier by decision 2026-08-05 — largest/riskiest change)_ — move `/movie/[id]` and `/person/[id]` off `"use client"`: fetch TMDB on the server, stream HTML, hydrate only the personal-list buttons as client islands. Kills the spinner-then-fetch waterfall — the change that most closes the gap with Letterboxd.
- [x] **Backfill legacy single-genre rows to two genres** ✅ 2026-08-05 — the lazy backfill in `usePersonalLists` now fires for rows with <2 genres (writing only when it actually improves); movie-detail adds also store the top two.
- [ ] **Verify signed in (needs your login):** the personal actions that only signed-in users hit — add / mark-watched on `/movie/[id]`, and search-Add landing on the watchlist. _(Public browsing of home, search, movie & person pages is now verified live signed-out: 200s, rows populate, gated routes 307 → login.)_
- [ ] _Optional polish:_ on the movie page, the signed-out Add / Mark-watched buttons route to `/login` without a `?next` back to the film — could thread `?next=/movie/<id>` so they return to the same page after signing in.
- [ ] _Optional:_ pull the `?list=` (discover) + detail TMDB fetches through `next: { revalidate }` caching (see the Performance tier) now that they're the public entry point and hit on every cold visit.
- [ ] Group password rotation / rename
- [ ] Pagination / "load more" in search (hardcoded to top 8 TMDB results) — `route.ts`
- [ ] Copy-to-clipboard button for group invite
- [ ] Extract shared year-parsing helper (duplicated in `page.tsx` and `SearchBar.tsx`)
- [ ] AbortController guard on search to avoid stale out-of-order results
