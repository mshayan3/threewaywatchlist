# Upcoming Tasks

_Triaged: do the top items first. The full engineering backlog lives in [TODO.md](../TODO.md); this file tracks the near-term priorities._

## 🔴 Now (blocking / next up)
- [ ] Verify signed in (needs your login): kick-member panel, atomic watched-removal, "no results" state, 6-per-row grid, inline sidebar search, compact Home, Watched sort
      _(schema.sql re-run ✓ 2026-08-03; invite link ✓ verified working end to end)_

## 🟡 Soon — Recommendation engine (LIVE ✅ 2026-08-03 — verify + tend)
Built + activated: schema v7 + compute RPCs + `scripts/build-vectors.mjs` (fetch/PostgREST, SDK-free) + Home/Catch-up UI. Catalog holds **3,841 films**.
- [ ] **Verify signed in:** Home "Recommended" deck (taste vs cold-start), Refresh, Add-to-watchlist / Seen-it; `/catch-up` triage + filmstrip.
- [ ] **Monthly:** re-run `SUPABASE_SERVICE_ROLE_KEY=<key> npm run build:vectors` to refresh the corpus (consider a cron/GitHub Action so it's not manual).
- [ ] _Optional:_ corpus came out 3,841 (top-rated ∪ popular overlap), under the ~5k target — bump `TARGET_CORPUS`/pages in `build-vectors.mjs` if a wider catalog is wanted.

## 🟡 Soon — Feature enhancements (requested 2026-08-03)
- [ ] **"Who has this?" on common watchlist** — for each movie in a group's common watchlist, show the list of members who have it in their personal watchlist. ⚠️ _Needs a design decision first: ask the user to pick among multiple implementation options (e.g. avatar row vs. hover tooltip vs. expandable list; client-join vs. server RPC) BEFORE building._
- [ ] **Filter-by in watchlist** — add filtering controls to the personal watchlist view
- [ ] **Filter-by in groups** — add filtering controls to the group / common watchlist view
- [ ] **Top 2 genres per movie** — show the top two genres for each movie instead of just one

## 🟢 Later / nice-to-have
- [ ] Movie detail view (overview, cast, TMDB link)
- [ ] Group password rotation / rename
- [ ] Pagination / "load more" in search (hardcoded to top 8 TMDB results) — `route.ts`
- [ ] Copy-to-clipboard button for group invite
- [ ] Extract shared year-parsing helper (duplicated in `page.tsx` and `SearchBar.tsx`)
- [ ] AbortController guard on search to avoid stale out-of-order results
