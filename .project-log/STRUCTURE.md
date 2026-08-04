# Project Structure

_Last mapped: 2026-08-04 19:29 (PKT)_

```
Threeway Watchlist/
├── .claude/
│   ├── launch.json
│   └── settings.local.json
├── scripts/
│   └── build-vectors.mjs        # offline: populate movie_vectors (npm run build:vectors)
├── sql/
│   └── redesign-migration.sql
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── tmdb/
│   │   │       └── route.ts
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts
│   │   ├── catch-up/
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── groups/
│   │   │   ├── [code]/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── home/
│   │   │   └── page.tsx           # legacy → redirects to "/"
│   │   ├── join/
│   │   │   └── [token]/
│   │   │       └── page.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── movie/
│   │   │   └── [id]/
│   │   │       └── page.tsx     # movie description page
│   │   ├── person/
│   │   │   └── [id]/
│   │   │       └── page.tsx     # director / actor page
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   ├── search/
│   │   │   └── page.tsx
│   │   ├── watched/
│   │   │   └── page.tsx
│   │   ├── watchlist/
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx              # public discover home (was marketing landing)
│   ├── components/
│   │   ├── AppNav.tsx
│   │   ├── AppShell.tsx
│   │   ├── AppView.tsx
│   │   ├── AuthView.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── Dashboard.tsx
│   │   ├── DiscoverHome.tsx        # public home body: search hero + browse rows
│   │   ├── GroupDetail.tsx
│   │   ├── GroupMovieCard.tsx
│   │   ├── GroupPicker.tsx
│   │   ├── GroupsPanel.tsx
│   │   ├── GroupView.tsx
│   │   ├── CatchUp.tsx
│   │   ├── Home.tsx                # retired (empty module) — recs live on Catch-up
│   │   ├── ListChrome.tsx
│   │   ├── MovieCard.tsx
│   │   ├── MovieDetailView.tsx    # /movie/[id] description page body
│   │   ├── MovieRow.tsx
│   │   ├── NavIcons.tsx
│   │   ├── PersonDetailView.tsx   # /person/[id] director/actor page body
│   │   ├── PersonalMovieCard.tsx
│   │   ├── SearchBar.tsx
│   │   ├── SearchView.tsx
│   │   ├── SidebarSearch.tsx
│   │   ├── SortMenu.tsx
│   │   ├── Spinner.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── Toast.tsx
│   │   ├── TopBar.tsx
│   │   ├── WatchCountBadge.tsx
│   │   ├── WatchedView.tsx
│   │   └── WatchlistView.tsx
│   ├── lib/
│   │   ├── helpers.ts
│   │   ├── supabaseClient.ts
│   │   ├── supabaseMiddleware.ts
│   │   ├── supabaseServer.ts
│   │   ├── tmdb.ts
│   │   ├── types.ts
│   │   ├── useAuthUser.ts
│   │   ├── useGroupDetail.ts
│   │   ├── useMyGroups.ts
│   │   ├── usePersonalLists.ts
│   │   ├── usePersonalPage.ts      # auth-gated pages (redirects signed-out)
│   │   ├── usePublicPage.ts        # public pages (resolves user, no redirect)
│   │   └── useSuggestions.ts
│   └── middleware.ts
├── .env.local
├── .env.local.example
├── .gitignore
├── next-env.d.ts
├── next.config.mjs
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── README.md
├── schema.sql
├── TODO.md
├── tsconfig.json
└── tsconfig.tsbuildinfo
```
