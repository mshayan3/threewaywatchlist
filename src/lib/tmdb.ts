import Fuse from "fuse.js";
import type { DiscoverList, MovieDetail, PersonDetail, TmdbResult } from "@/lib/types";

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

// Fetch the full detail payload for a movie's description page (via our proxy).
// Throws with the server's error message so the page can render a failed state.
export async function fetchMovieDetail(id: number | string): Promise<MovieDetail> {
  const res = await fetch(`/api/tmdb?movie=${encodeURIComponent(id)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Lookup failed (${res.status})`);
  return data as MovieDetail;
}

// Fetch a curated browse row for the public home page. `key` is one of the
// server-recognized list keys (now_playing, trending, top_rated, popular,
// upcoming, popular_people).
export async function fetchList(key: string): Promise<DiscoverList> {
  const res = await fetch(`/api/tmdb?list=${encodeURIComponent(key)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `List failed (${res.status})`);
  return data as DiscoverList;
}

// Fetch a person's bio + filmography for the director/actor page.
export async function fetchPersonDetail(id: number | string): Promise<PersonDetail> {
  const res = await fetch(`/api/tmdb?person=${encodeURIComponent(id)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Lookup failed (${res.status})`);
  return data as PersonDetail;
}

// Hover prefetch: warm the server Data Cache for a detail payload before the
// user clicks through. The route's TMDB fetches are revalidate-cached, so this
// first hit populates that cache and the real navigation reads it back fast.
// Deduped per id+kind so repeated hovers fire at most one request.
const prefetched = new Set<string>();
function prefetchDetail(kind: "movie" | "person", id: number | string) {
  const key = `${kind}:${id}`;
  if (prefetched.has(key)) return;
  prefetched.add(key);
  // Fire-and-forget; drop the dedupe marker on failure so a later hover retries.
  fetch(`/api/tmdb?${kind}=${encodeURIComponent(id)}`).catch(() => {
    prefetched.delete(key);
  });
}
export const prefetchMovieDetail = (id: number | string) => prefetchDetail("movie", id);
export const prefetchPersonDetail = (id: number | string) => prefetchDetail("person", id);

// Fetch a single movie's rating + genre from TMDB (via our proxy). Returns null
// on any failure so callers can skip it silently during lazy backfill.
export async function fetchMovieMeta(
  id: number
): Promise<{ rating: number; genre: string } | null> {
  try {
    const res = await fetch(`/api/tmdb?id=${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const d = await res.json();
    return { rating: d.rating ?? 0, genre: d.genre ?? "" };
  } catch {
    return null;
  }
}
