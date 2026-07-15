import { NextResponse } from "next/server";
import type { TmdbResult } from "@/lib/types";

// Server-side TMDB search proxy.
// The TMDB token is read from the server-only TMDB_TOKEN env var and never
// reaches the browser.
export const runtime = "edge";

// TMDB movie genre id → name (static; avoids an extra /genre/movie/list call).
const GENRES: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance",
  878: "Sci-Fi", 10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
};

interface TmdbApiResult {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  vote_average?: number;
  genre_ids?: number[];
}

function firstGenre(ids?: number[]): string {
  for (const id of ids || []) if (GENRES[id]) return GENRES[id];
  return "";
}

export async function GET(request: Request) {
  const token = process.env.TMDB_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "TMDB token not configured on the server." },
      { status: 500 }
    );
  }

  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(
        q
      )}&include_adult=false&page=1`,
      {
        headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
      }
    );
    if (!res.ok) {
      // Distinguish the two failures that actually matter to callers:
      // 429 (rate limited — retryable) and 401 (bad server token — a config
      // problem, not the client's fault). Everything else stays a 502.
      if (res.status === 429) {
        return NextResponse.json(
          { error: "TMDB rate limit reached — wait a moment and try again." },
          { status: 429 }
        );
      }
      if (res.status === 401) {
        return NextResponse.json(
          { error: "TMDB rejected the server token. Check TMDB_TOKEN." },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: `TMDB ${res.status}` }, { status: 502 });
    }
    const data = await res.json();
    // Return up to 20 candidates; the client fuzzy-re-ranks and shows the top 8.
    const results: TmdbResult[] = ((data.results || []) as TmdbApiResult[])
      .slice(0, 20)
      .map((r) => ({
        id: r.id,
        title: r.title,
        release_date: r.release_date,
        poster_path: r.poster_path,
        rating: r.vote_average ? Math.round(r.vote_average * 10) / 10 : 0,
        genre: firstGenre(r.genre_ids),
      }));
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json(
      { error: `Search failed: ${message}` },
      { status: 502 }
    );
  }
}
