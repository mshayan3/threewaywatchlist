"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { parseYear } from "@/lib/helpers";
import { fetchMovieMeta } from "@/lib/tmdb";
import { useToast } from "@/components/Toast";
import type { AppUser, PersonalMovie, TmdbResult, WatchedRow, WatchlistRow } from "@/lib/types";

// Owns the signed-in user's personal watchlist + watched list: initial load,
// realtime sync on their own rows, and all mutations. Shared by the dashboard
// (full lists) and the group view (just needs the id sets + add).
//
// `onChange` fires after any local mutation/refresh so a caller (e.g. the group
// page) can re-derive data that depends on these lists.
export function usePersonalLists(user: AppUser | null, onChange?: () => void) {
  const toast = useToast();
  const [watchlist, setWatchlist] = useState<PersonalMovie[]>([]);
  const [watchedList, setWatchedList] = useState<PersonalMovie[]>([]);
  // tmdb_id -> number of times this user has watched the movie (durable, list-independent)
  const [watchCounts, setWatchCounts] = useState<Map<number, number>>(new Map());

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // tmdb_ids we've already attempted a rating/genre backfill for this session,
  // so we never re-hit TMDB for a movie TMDB genuinely has no data on.
  const backfillTried = useRef<Set<number>>(new Set());

  // Legacy rows added before rating/genre were captured come back with
  // rating 0 / empty genre. Lazily re-fetch those from TMDB once, write them
  // back to the DB, and patch local state. Group cards pick the ratings up via
  // the group_movies RPC on their next refresh (onChange).
  const backfillMeta = useCallback(
    async (items: { tmdbId: number; table: "watchlist" | "watched" }[]) => {
      if (!user || items.length === 0) return;
      let changed = false;
      await Promise.all(
        items.map(async ({ tmdbId, table }) => {
          const meta = await fetchMovieMeta(tmdbId);
          if (!meta || (meta.rating <= 0 && !meta.genre)) return;
          await supabase
            .from(table)
            .update({ rating: meta.rating, genre: meta.genre })
            .match({ user_id: user.id, tmdb_id: tmdbId });
          const patch = (arr: PersonalMovie[]) =>
            arr.map((m) =>
              m.tmdbId === tmdbId
                ? { ...m, rating: meta.rating || m.rating, genre: meta.genre || m.genre }
                : m
            );
          setWatchlist(patch);
          setWatchedList(patch);
          changed = true;
        })
      );
      if (changed) onChangeRef.current?.();
    },
    [user]
  );

  const reload = useCallback(async () => {
    if (!user) return;
    const [wlRes, wdRes, wcRes] = await Promise.all([
      supabase.from("watchlist").select("*").eq("user_id", user.id),
      supabase.from("watched").select("*").eq("user_id", user.id),
      supabase.from("watch_counts").select("tmdb_id,count").eq("user_id", user.id),
    ]);
    if (wlRes.error || wdRes.error || wcRes.error) {
      toast("Couldn't load your lists: " + (wlRes.error || wdRes.error || wcRes.error)!.message);
      return;
    }
    const counts = new Map<number, number>();
    for (const row of (wcRes.data as { tmdb_id: number; count: number }[]) || [])
      counts.set(row.tmdb_id, row.count);
    setWatchCounts(counts);
    const map = (r: WatchlistRow | WatchedRow, at: string): PersonalMovie => ({
      tmdbId: r.tmdb_id,
      title: r.title,
      year: r.year || "",
      poster: r.poster || "",
      rating: r.rating ?? 0,
      genre: r.genre || "",
      at,
      watchCount: counts.get(r.tmdb_id) ?? 0,
    });
    const wlMapped = ((wlRes.data as WatchlistRow[]) || []).map((r) => map(r, r.added_at));
    const wdMapped = ((wdRes.data as WatchedRow[]) || []).map((r) => map(r, r.watched_at));
    setWatchlist(wlMapped);
    setWatchedList(wdMapped);

    // Queue a one-time lazy backfill for rows missing rating or genre.
    const stale: { tmdbId: number; table: "watchlist" | "watched" }[] = [
      ...wlMapped
        .filter((m) => !m.rating || !m.genre)
        .map((m) => ({ tmdbId: m.tmdbId, table: "watchlist" as const })),
      ...wdMapped
        .filter((m) => !m.rating || !m.genre)
        .map((m) => ({ tmdbId: m.tmdbId, table: "watched" as const })),
    ].filter((s) => !backfillTried.current.has(s.tmdbId));
    if (stale.length) {
      stale.forEach((s) => backfillTried.current.add(s.tmdbId));
      void backfillMeta(stale);
    }
  }, [user, toast, backfillMeta]);

  // Initial load + realtime subscription on the user's own rows.
  useEffect(() => {
    if (!user) {
      setWatchlist([]);
      setWatchedList([]);
      return;
    }
    reload();
    const opt = (table: string) => ({
      event: "*" as const,
      schema: "public",
      table,
      filter: `user_id=eq.${user.id}`,
    });
    const handler = () => {
      reload();
      onChangeRef.current?.();
    };
    const channel = supabase
      .channel("me-" + user.id)
      .on("postgres_changes", opt("watchlist"), handler)
      .on("postgres_changes", opt("watched"), handler)
      .on("postgres_changes", opt("watch_counts"), handler)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, reload]);

  const after = useCallback(() => {
    reload();
    onChangeRef.current?.();
  }, [reload]);

  // A movie is either "to watch" or "watched", never both — each mutation
  // clears the other list first.
  const add = useCallback(
    async (r: TmdbResult) => {
      if (!user) return;
      await supabase.from("watched").delete().match({ user_id: user.id, tmdb_id: r.id });
      const { error } = await supabase.from("watchlist").upsert(
        {
          user_id: user.id,
          tmdb_id: r.id,
          title: r.title,
          year: parseYear(r.release_date),
          poster: r.poster_path || "",
          rating: r.rating ?? 0,
          genre: r.genre || "",
        },
        { onConflict: "user_id,tmdb_id" }
      );
      if (error) return toast("Add failed: " + error.message);
      toast(`Added "${r.title}"`);
      after();
    },
    [user, toast, after]
  );

  // Add a fresh search result straight into the watched list (used when the
  // Watched tab is open). Counts as a watch, so it bumps the watch counter —
  // reversible via removeFromWatched, which decrements it again.
  const addToWatched = useCallback(
    async (r: TmdbResult) => {
      if (!user) return;
      await supabase.from("watchlist").delete().match({ user_id: user.id, tmdb_id: r.id });
      const { error } = await supabase.from("watched").upsert(
        {
          user_id: user.id,
          tmdb_id: r.id,
          title: r.title,
          year: parseYear(r.release_date),
          poster: r.poster_path || "",
          rating: r.rating ?? 0,
          genre: r.genre || "",
        },
        { onConflict: "user_id,tmdb_id" }
      );
      if (error) return toast("Add failed: " + error.message);
      const { error: cErr } = await supabase.rpc("increment_watch_count", { p_tmdb: r.id });
      if (cErr) toast("Watch count not updated: " + cErr.message);
      toast(`Added "${r.title}" to watched`);
      after();
    },
    [user, toast, after]
  );

  const markWatched = useCallback(
    async (m: PersonalMovie) => {
      if (!user) return;
      await supabase.from("watchlist").delete().match({ user_id: user.id, tmdb_id: m.tmdbId });
      const { error } = await supabase.from("watched").upsert(
        { user_id: user.id, tmdb_id: m.tmdbId, title: m.title, year: m.year, poster: m.poster, rating: m.rating, genre: m.genre },
        { onConflict: "user_id,tmdb_id" }
      );
      if (error) return toast("Failed: " + error.message);
      // Bump the durable watch counter (0 -> 1 first time, +1 on each rewatch).
      const { error: cErr } = await supabase.rpc("increment_watch_count", { p_tmdb: m.tmdbId });
      if (cErr) toast("Watch count not updated: " + cErr.message);
      after();
    },
    [user, toast, after]
  );

  const moveToWatchlist = useCallback(
    async (m: PersonalMovie) => {
      if (!user) return;
      await supabase.from("watched").delete().match({ user_id: user.id, tmdb_id: m.tmdbId });
      const { error } = await supabase.from("watchlist").upsert(
        { user_id: user.id, tmdb_id: m.tmdbId, title: m.title, year: m.year, poster: m.poster, rating: m.rating, genre: m.genre },
        { onConflict: "user_id,tmdb_id" }
      );
      if (error) return toast("Failed: " + error.message);
      after();
    },
    [user, toast, after]
  );

  const removeFromWatchlist = useCallback(
    async (m: PersonalMovie) => {
      if (!user) return;
      const { error } = await supabase
        .from("watchlist")
        .delete()
        .match({ user_id: user.id, tmdb_id: m.tmdbId });
      if (error) return toast("Failed: " + error.message);
      after();
    },
    [user, toast, after]
  );

  const removeFromWatched = useCallback(
    async (m: PersonalMovie) => {
      if (!user) return;
      const { error } = await supabase
        .from("watched")
        .delete()
        .match({ user_id: user.id, tmdb_id: m.tmdbId });
      if (error) return toast("Failed: " + error.message);
      // Failsafe: removing from watched walks the watch counter back down
      // (floored at 0), so an accidental watched-add can be fully undone.
      const { error: cErr } = await supabase.rpc("decrement_watch_count", { p_tmdb: m.tmdbId });
      if (cErr) toast("Watch count not updated: " + cErr.message);
      after();
    },
    [user, toast, after]
  );

  const watchlistIds = useMemo(() => new Set(watchlist.map((m) => m.tmdbId)), [watchlist]);
  const watchedIds = useMemo(() => new Set(watchedList.map((m) => m.tmdbId)), [watchedList]);

  return {
    watchlist,
    watchedList,
    watchlistIds,
    watchedIds,
    watchCounts,
    reload,
    add,
    addToWatched,
    markWatched,
    moveToWatchlist,
    removeFromWatchlist,
    removeFromWatched,
  };
}
