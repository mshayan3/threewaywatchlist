# Threeway Watchlist

**One-liner:** A movie watchlist app where personal lists pool into shared groups, surfacing only movies nobody in the group has watched yet.

Each user keeps their own watchlist and "watched" list on a personal dashboard. Any group you join draws its **common watchlist** from the combined personal lists of all members — and only shows movies **nobody in the group has watched yet**. The moment any member marks a movie watched, it drops off the group's common list, so whatever's left is always something everyone can watch together. Currently deployed and live on Vercel.

**Stack / key tools:** Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 · React 19 · Supabase (Postgres + Auth + Realtime, cookie sessions via `@supabase/ssr`, RLS-enforced) · TMDB API (server-side proxy) · fuse.js (search) · deployed on Vercel.

**Links:** Live — <https://threewaywatchlist.vercel.app> · Supabase — `https://vfqlewzzpcortkfupckb.supabase.co`
