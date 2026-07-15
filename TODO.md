# ThreeWay Watchlist — TODO

## 1. Things to Add

- [ ] Loading state for auth/session resolution (avoid flash of sign-in screen on reload) — `page.tsx`
- [ ] "No results" state in search dropdown — `SearchBar.tsx`
- [ ] Group password rotation / rename (only create/join/leave/delete exist) — `schema.sql`
- [ ] Movie detail view (overview, cast, TMDB link) — currently only title/year/poster/adder shown
- [ ] Owner ability to remove (kick) a member — only self-service `leave_group` exists
- [ ] Pagination / "load more" in search (hardcoded to top 8 TMDB results) — `route.ts`
- [ ] Smarter default tab in GroupPicker (new users land on "join" instead of "create")
- [ ] Copy-to-clipboard button for group name/password invite

## 2. Things to Fix

- [ ] Race condition: realtime subscription starts after `refresh()`, missing changes in between — `page.tsx` ~130-132
- [ ] Failed `refresh()` only toasts; no stale-data indicator or retry
- [ ] `removeMovie` deletes from `watched` then `movies` non-atomically — partial failure leaves inconsistent state — `page.tsx` ~255-265
- [ ] `create_group` existence check isn't race-safe (two concurrent creations can both pass) — `schema.sql` ~89-105
- [ ] TMDB 429 (rate limit) and 401 (auth) errors both surface as generic 502 — `route.ts` ~32-37
- [ ] `normalizeCode` strips non-Latin characters, silently rejecting non-ASCII group names — `helpers.ts` ~33-39
- [ ] No fallback UX when `localStorage` is blocked (private browsing) — silently loses group-switch persistence
- [ ] Members with null/empty `user_name` are visually indistinguishable in member list
- [ ] No rate limiting/audit trail on `delete_group`/`leave_group` RPCs
- [ ] Duplicated, unvalidated `release_date.slice(0,4)` parsing assumes TMDB always returns `YYYY-MM-DD`

## 3. Things to Improve

- [ ] Extract year-parsing into a shared helper instead of duplicating in `page.tsx` and `SearchBar.tsx`
- [ ] `refresh()` re-fetches all 3 tables on every realtime event — patch state incrementally instead
- [ ] No memoization/virtualization for movie lists (fine now, won't scale to large groups)
- [ ] Horizontal movie lists lack keyboard scroll affordances (accessibility)
- [ ] Poster images use `alt=""` — should describe the movie for screen readers
- [ ] Replace blocking `confirm()` dialogs for leave/delete with styled in-app modals
- [ ] Search lacks request-id/AbortController guard — fast typing can show stale out-of-order results
- [ ] Repeated Tailwind class strings across components — extract shared style constants
- [ ] Consider explicit index on `group_members(user_id, group_code)` for `is_member` RLS lookups at scale
- [ ] TMDB edge route has no `cache`/`revalidate` — identical searches always hit TMDB fresh
