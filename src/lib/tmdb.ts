import Fuse from "fuse.js";
import type { TmdbResult } from "@/lib/types";

// How many suggestions we actually surface in the dropdown.
const MAX_RESULTS = 8;

// Client-side helper: hits our own /api/tmdb route (server holds the token),
// then fuzzy-re-ranks the candidates for typo tolerance before display.
//
// TMDB's own search is already decent, but it's exact-ish: a transposed or
// dropped letter ("intersteller", "dark knght") can bury or miss the intended
// title. We fetch a wider candidate set from TMDB and re-rank it locally with
// Fuse.js (Bitap approximate matching). Strong fuzzy matches float to the top;
// everything else keeps TMDB's popularity order behind them, so we never drop
// a valid result — we only reorder.
export async function searchMovies(query: string): Promise<TmdbResult[]> {
  const res = await fetch(`/api/tmdb?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Search failed (${res.status})`);
  }
  const data = await res.json();
  const results: TmdbResult[] = data.results || [];
  return rerank(results, query).slice(0, MAX_RESULTS);
}

export function rerank(results: TmdbResult[], query: string): TmdbResult[] {
  const q = query.trim();
  if (q.length === 0 || results.length <= 1) return results;

  const fuse = new Fuse(results, {
    keys: ["title"],
    threshold: 0.5, // moderately forgiving of typos
    ignoreLocation: true, // match anywhere in the title, not just the start
    includeScore: true,
  });

  const matched = fuse.search(q).map((r) => r.item);
  if (matched.length === 0) return results; // no fuzzy hits → keep TMDB order

  const matchedIds = new Set(matched.map((m) => m.id));
  const rest = results.filter((m) => !matchedIds.has(m.id));
  return [...matched, ...rest];
}
