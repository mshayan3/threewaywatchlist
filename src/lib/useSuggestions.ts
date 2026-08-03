"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { AppUser, PersonalMovie } from "@/lib/types";

// One row from the `recommendations` RPC (cached content-based suggestions,
// joined with display metadata; the embedding never leaves the DB).
type RecRow = {
  tmdb_id: number;
  title: string;
  year: string | null;
  poster: string | null;
  rating: number | null;
  genre: string | null;
  score: number | null;
  source: string | null; // 'taste' | 'cold'
};

// How the suggestions were derived, for a UI hint:
//   "taste" → cosine-NN of the user's watched-films taste vector
//   "cold"  → popularity-by-genre fallback (no watch history yet)
export type SuggestionSource = "taste" | "cold" | null;

const map = (r: RecRow): PersonalMovie => ({
  tmdbId: r.tmdb_id,
  title: r.title,
  year: r.year || "",
  poster: r.poster || "",
  rating: r.rating ?? 0,
  genre: r.genre || "",
  at: "",
  watchCount: 0,
  verdict: null,
});

// Reads the signed-in user's cached recommendations (the `recommendations` RPC
// auto-computes on a cold cache, so the first call always returns something).
// `refresh` forces a server-side recompute — call it after the user's lists
// change so stale picks (now queued/seen) drop out.
export function useSuggestions(user: AppUser | null, limit = 24) {
  const [suggestions, setSuggestions] = useState<PersonalMovie[]>([]);
  const [source, setSource] = useState<SuggestionSource>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setSuggestions([]);
      setSource(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("recommendations", { p_limit: limit });
    if (!error && data) {
      const rows = data as RecRow[];
      setSuggestions(rows.map(map));
      setSource((rows[0]?.source as SuggestionSource) ?? null);
    }
    setLoading(false);
  }, [user, limit]);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // Recompute the cache (best-effort), then re-read it.
    await supabase.rpc("refresh_suggestions", { p_limit: Math.max(limit, 40) });
    await load();
  }, [user, limit, load]);

  useEffect(() => {
    load();
  }, [load]);

  return { suggestions, source, loading, refresh, reload: load };
}
