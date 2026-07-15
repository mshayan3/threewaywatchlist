# 🎬 Threeway Watchlist

A movie watchlist app built around **personal lists that pool into groups**. Each user
keeps their own watchlist and "watched" list on a personal dashboard. Any group you join
draws its **common watchlist** from the combined personal lists of all its members — and
**only shows movies nobody in the group has watched yet**. The moment any member marks a
movie watched, it drops off that group's common list, so whatever's left is always
something you can all watch together.

Built with **Next.js (App Router) + TypeScript + Tailwind CSS**. Movie data from
**TMDB**; shared list, Google auth, and realtime from **Supabase** (Postgres + Auth +
Realtime). Deploys on **Vercel**.

- **Live URL:** <https://threewaywatchlist.vercel.app>
- **Supabase URL:** `https://vfqlewzzpcortkfupckb.supabase.co`

## How it works

1. Everyone opens the site (public **landing page**) and **signs in** — with Google,
   Apple, or email (magic link or password) — landing on their **personal dashboard**.
2. On the dashboard you **search a movie → Add** to build your own watchlist, and mark
   movies **"I watched this"** to move them to your personal *Watched* list.
3. To watch with friends, **create a group** (name + password) or **join** one. Your
   personal watchlist is automatically pooled into every group you belong to — no
   re-adding per group.
4. Open a group to see its **common watchlist**: everything any member wants to see,
   minus anything any member has already watched.
5. Because the source is each member's personal list, adding a movie on your dashboard
   surfaces it in all your groups, and marking it watched removes it from those groups'
   common lists.

The TMDB token is kept **server-side** (in the `/api/tmdb` route), so it never reaches
the browser. The Supabase anon key is public by design — access is enforced by Row
Level Security.

## Project layout

```
.
├─ src/
│  ├─ middleware.ts          refreshes the session + guards /dashboard, /groups
│  ├─ app/
│  │  ├─ layout.tsx          root layout, fonts, theme anti-flash
│  │  ├─ page.tsx            public landing page (hero + CTA)
│  │  ├─ login/page.tsx      login (Google, Apple, email magic-link + password)
│  │  ├─ dashboard/page.tsx  personal dashboard route (protected)
│  │  ├─ groups/[code]/page.tsx  a group's combined watchlist (protected)
│  │  ├─ auth/callback/route.ts  OAuth / magic-link code exchange
│  │  ├─ globals.css         Still Water theme + Tailwind
│  │  └─ api/tmdb/route.ts   server-side TMDB search proxy
│  ├─ components/            TopBar, Dashboard, GroupsPanel, GroupView,
│  │                         PersonalMovieCard, GroupMovieCard, MovieRow, SearchBar, Toast, ThemeToggle
│  └─ lib/                   supabaseClient (browser), supabaseServer, supabaseMiddleware,
│                            useAuthUser, usePersonalLists, useMyGroups, tmdb, types, helpers
├─ schema.sql                Supabase schema (run once in the SQL Editor)
├─ .env.local.example        env template
└─ ...
```

## Run locally

```
npm install
npm run dev
```

Open <http://localhost:3000>. Environment variables live in `.env.local` (copy
`.env.local.example` and fill in the values):

| Name | Scope | Notes |
| ---- | ----- | ----- |
| `TMDB_TOKEN` | server-only | TMDB v4 "API Read Access Token" |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase `sb_publishable_...` key |

`http://localhost:3000` is in the Supabase redirect allowlist for local Google login.

## Deploy (Vercel)

The repo root **is** the Next.js app, so Vercel's Root Directory is `/`. Pushing to
`main` triggers a production deploy automatically. The three env vars above are set in
Project Settings → Environment Variables.

When the deployment URL changes (new project or custom domain), add the new URL to
**Supabase → Authentication → URL Configuration → Redirect URLs** (e.g.
`https://<domain>/**`), or login will fail. The wildcard covers the app's
`/auth/callback` handler used by OAuth and email magic links. The provider-side OAuth
redirect URI stays `https://vfqlewzzpcortkfupckb.supabase.co/auth/v1/callback`.

**Auth providers:** sign-in uses cookie-based sessions (`@supabase/ssr`) with route
protection in `src/middleware.ts`. Enable the providers you want under **Supabase →
Authentication → Providers**: Google and Apple (Apple needs an Apple Developer Services
ID + key) for OAuth, and Email for magic links / password sign-in.

## Database

`schema.sql` sets up the `groups` and `group_members` tables plus the **personal,
user-scoped** `watchlist` and `watched` tables. Personal lists are private via Row Level
Security (each user sees only their own rows); a group's combined list is derived by the
`group_movies(p_code)` SECURITY DEFINER RPC, which pools members' lists and hides anything
any member has watched. Also includes the create/join/leave/delete RPCs and realtime. Run
it once in Supabase → SQL Editor (safe to re-run).

> **Note:** v2 replaces the old group-scoped `movies`/`watched` tables. Running the
> updated `schema.sql` **drops them** (fresh start — no data migration).

## Attribution

Movie data from [TMDB](https://www.themoviedb.org/) — not endorsed or certified by TMDB.
