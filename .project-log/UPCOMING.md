# Upcoming Tasks

_Triaged: do the top items first. The full engineering backlog lives in [TODO.md](../TODO.md); this file tracks the near-term priorities._

## 🔴 Now (blocking / next up)
- [ ] Verify signed in (needs your login): kick-member panel, atomic watched-removal, "no results" state, 6-per-row grid, inline sidebar search, compact Home, Watched sort
      _(schema.sql re-run ✓ 2026-08-03; invite link ✓ verified working end to end)_

## 🟡 Soon — Recommendation engine (LIVE ✅ 2026-08-03 — verify + tend)
Built + activated: schema v7 + compute RPCs + `scripts/build-vectors.mjs` (fetch/PostgREST, SDK-free) + Catch-up UI. Catalog holds **3,841 films**. _(As of 2026-08-04 the deck lives ONLY on `/catch-up` — Home is now a public discover surface; `Home.tsx` retired.)_
- [ ] **Verify signed in:** `/catch-up` triage + filmstrip (taste vs cold-start), Add-to-watchlist / Seen-it.
- [ ] **Monthly:** re-run `SUPABASE_SERVICE_ROLE_KEY=<key> npm run build:vectors` to refresh the corpus (consider a cron/GitHub Action so it's not manual).
- [ ] _Optional:_ corpus came out 3,841 (top-rated ∪ popular overlap), under the ~5k target — bump `TARGET_CORPUS`/pages in `build-vectors.mjs` if a wider catalog is wanted.

## 🟡 Soon — Performance / snappiness (why Letterboxd feels faster — diagnosed 2026-08-05)
_Root cause: every page is client-rendered with a spinner→fetch waterfall and TMDB calls are uncached, vs Letterboxd's edge-cached server-rendered HTML. Ordered by leverage._
- [ ] **Cache TMDB fetches** (biggest win, lowest risk) — add `next: { revalidate }` to every `fetch()` in `src/app/api/tmdb/route.ts`: details (movie/person/id) `86400`, discover lists (`trending`/`now_playing`/etc.) `3600`. Makes repeat navigation feel instant and cuts TMDB-dependency risk.
- [ ] **Server-render public detail pages** — move `/movie/[id]` and `/person/[id]` off `"use client"`: fetch TMDB on the server, stream HTML, hydrate only the personal-list buttons as client islands. Kills the spinner-then-fetch waterfall — the change that most closes the gap with Letterboxd.
- [ ] **Swap raw `<img>` → `next/image`** — 10+ components hit `image.tmdb.org` directly (Home, SearchBar, MovieDetailView, PersonDetailView, cards, Catch-up, Watchlist/Watched views). Gains lazy-loading, AVIF/WebP, and reserved dimensions (no layout shift). Sized paths (w92/w300/w500) already in place, so mostly mechanical.
- [ ] **Prefetch detail data on hover** — for poster grids, prefetch the movie/person payload on hover so clicks feel zero-latency (the Letterboxd feel).

## 🟡 Soon — Feature enhancements (requested 2026-08-03)
- [ ] **"Who has this?" on common watchlist** — for each movie in a group's common watchlist, show the list of members who have it in their personal watchlist. ⚠️ _Needs a design decision first: ask the user to pick among multiple implementation options (e.g. avatar row vs. hover tooltip vs. expandable list; client-join vs. server RPC) BEFORE building._
- [ ] **Filter-by in watchlist** — add filtering controls to the personal watchlist view
- [ ] **Filter-by in groups** — add filtering controls to the group / common watchlist view
- [ ] **Top 2 genres per movie** — show the top two genres for each movie instead of just one

## 🟢 Later / nice-to-have
- [ ] **Verify signed in (needs your login):** the personal actions that only signed-in users hit — add / mark-watched on `/movie/[id]`, and search-Add landing on the watchlist. _(Public browsing of home, search, movie & person pages is now verified live signed-out: 200s, rows populate, gated routes 307 → login.)_
- [ ] _Optional polish:_ on the movie page, the signed-out Add / Mark-watched buttons route to `/login` without a `?next` back to the film — could thread `?next=/movie/<id>` so they return to the same page after signing in.
- [ ] _Optional:_ pull the `?list=` (discover) + detail TMDB fetches through `next: { revalidate }` caching (see the Performance tier) now that they're the public entry point and hit on every cold visit.
- [ ] Group password rotation / rename
- [ ] Pagination / "load more" in search (hardcoded to top 8 TMDB results) — `route.ts`
- [ ] Copy-to-clipboard button for group invite
- [ ] Extract shared year-parsing helper (duplicated in `page.tsx` and `SearchBar.tsx`)
- [ ] AbortController guard on search to avoid stale out-of-order results
