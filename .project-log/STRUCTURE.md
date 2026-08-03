# Project Structure

_Last mapped: 2026-08-03 18:07 (PKT)_

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
│   │   │   └── page.tsx
│   │   ├── join/
│   │   │   └── [token]/
│   │   │       └── page.tsx
│   │   ├── login/
│   │   │   └── page.tsx
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
│   │   └── page.tsx
│   ├── components/
│   │   ├── AppNav.tsx
│   │   ├── AppShell.tsx
│   │   ├── AppView.tsx
│   │   ├── AuthView.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── Dashboard.tsx
│   │   ├── GroupDetail.tsx
│   │   ├── GroupMovieCard.tsx
│   │   ├── GroupPicker.tsx
│   │   ├── GroupsPanel.tsx
│   │   ├── GroupView.tsx
│   │   ├── CatchUp.tsx
│   │   ├── Home.tsx
│   │   ├── ListChrome.tsx
│   │   ├── MovieCard.tsx
│   │   ├── MovieRow.tsx
│   │   ├── NavIcons.tsx
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
│   │   ├── usePersonalPage.ts
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
