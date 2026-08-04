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

function round1(n?: number): number {
  return n ? Math.round(n * 10) / 10 : 0;
}

function yearOf(date?: string | null): string {
  const m = /^(\d{4})/.exec((date || "").trim());
  return m ? m[1] : "";
}

const TMDB = "https://api.themoviedb.org/3";

// Map a non-OK TMDB response to the error shape callers already expect. 429
// (rate limited — retryable) and 401 (bad server token — a config problem) get
// their own messages; everything else is a generic 502.
function statusError(status: number): NextResponse {
  if (status === 429) {
    return NextResponse.json(
      { error: "TMDB rate limit reached — wait a moment and try again." },
      { status: 429 }
    );
  }
  if (status === 401) {
    return NextResponse.json(
      { error: "TMDB rejected the server token. Check TMDB_TOKEN." },
      { status: 500 }
    );
  }
  return NextResponse.json({ error: `TMDB ${status}` }, { status: 502 });
}

// One TMDB crew/cast entry as returned under append_to_response=credits.
interface TmdbCredit {
  id: number;
  name: string;
  profile_path?: string | null;
  job?: string;
  character?: string;
}

// One entry in a person's movie_credits (cast or crew).
interface TmdbPersonCredit {
  id: number;
  title?: string;
  release_date?: string;
  poster_path?: string | null;
  vote_average?: number;
  job?: string;
  character?: string;
}

export async function GET(request: Request) {
  const token = process.env.TMDB_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "TMDB token not configured on the server." },
      { status: 500 }
    );
  }

  const url = new URL(request.url);

  // Details-by-id branch: returns rating + genre for a single movie. Used by
  // the client to lazily backfill legacy list rows that predate rating/genre
  // capture.
  const id = url.searchParams.get("id")?.trim();
  if (id) {
    try {
      const res = await fetch(`https://api.themoviedb.org/3/movie/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
      });
      if (!res.ok) {
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
      const d = (await res.json()) as {
        id: number;
        vote_average?: number;
        genres?: { id: number; name: string }[];
      };
      const g = d.genres?.[0];
      return NextResponse.json({
        id: d.id,
        rating: d.vote_average ? Math.round(d.vote_average * 10) / 10 : 0,
        genre: g ? GENRES[g.id] || g.name || "" : "",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      return NextResponse.json({ error: `Lookup failed: ${message}` }, { status: 502 });
    }
  }

  const headers = { Authorization: `Bearer ${token}`, accept: "application/json" };

  // Movie-detail branch: full description-page payload (overview, runtime,
  // genres, director(s), top cast) for /movie/[id].
  const movieId = url.searchParams.get("movie")?.trim();
  if (movieId) {
    try {
      const res = await fetch(
        `${TMDB}/movie/${encodeURIComponent(movieId)}?append_to_response=credits`,
        { headers }
      );
      if (!res.ok) return statusError(res.status);
      const d = (await res.json()) as {
        id: number;
        title: string;
        tagline?: string;
        overview?: string;
        release_date?: string;
        runtime?: number;
        vote_average?: number;
        vote_count?: number;
        poster_path?: string | null;
        backdrop_path?: string | null;
        genres?: { id: number; name: string }[];
        credits?: { cast?: TmdbCredit[]; crew?: TmdbCredit[] };
      };
      const directors = (d.credits?.crew || [])
        .filter((c) => c.job === "Director")
        .map((c) => ({ id: c.id, name: c.name, profilePath: c.profile_path ?? null }));
      const cast = (d.credits?.cast || []).slice(0, 12).map((c) => ({
        id: c.id,
        name: c.name,
        profilePath: c.profile_path ?? null,
        character: c.character || "",
      }));
      return NextResponse.json({
        id: d.id,
        title: d.title,
        tagline: d.tagline || "",
        overview: d.overview || "",
        year: yearOf(d.release_date),
        releaseDate: d.release_date || "",
        runtime: d.runtime || 0,
        rating: round1(d.vote_average),
        voteCount: d.vote_count || 0,
        genres: (d.genres || []).map((g) => GENRES[g.id] || g.name).filter(Boolean),
        poster: d.poster_path ?? null,
        backdrop: d.backdrop_path ?? null,
        directors,
        cast,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      return NextResponse.json({ error: `Lookup failed: ${message}` }, { status: 502 });
    }
  }

  // Person-detail branch: bio + movie filmography split into acting vs.
  // directing, for /person/[id] (serves both the actor and director pages).
  const personId = url.searchParams.get("person")?.trim();
  if (personId) {
    try {
      const res = await fetch(
        `${TMDB}/person/${encodeURIComponent(personId)}?append_to_response=movie_credits`,
        { headers }
      );
      if (!res.ok) return statusError(res.status);
      const d = (await res.json()) as {
        id: number;
        name: string;
        biography?: string;
        profile_path?: string | null;
        known_for_department?: string;
        birthday?: string | null;
        deathday?: string | null;
        place_of_birth?: string | null;
        movie_credits?: { cast?: TmdbPersonCredit[]; crew?: TmdbPersonCredit[] };
      };

      const toCredit = (c: TmdbPersonCredit, role: string) => ({
        id: c.id,
        title: c.title || "",
        year: yearOf(c.release_date),
        poster: c.poster_path ?? null,
        rating: round1(c.vote_average),
        role,
      });
      // Newest first; undated films (year "") sink to the bottom.
      const byYearDesc = (a: { year: string }, b: { year: string }) =>
        (b.year || "0").localeCompare(a.year || "0");

      const actingCredits = (d.movie_credits?.cast || [])
        .filter((c) => c.title)
        .map((c) => toCredit(c, c.character || ""))
        .sort(byYearDesc);

      // A person can be credited on the same film in several crew roles; keep
      // only their Director credits and one row per film.
      const seen = new Set<number>();
      const directingCredits = (d.movie_credits?.crew || [])
        .filter((c) => c.job === "Director" && c.title)
        .filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)))
        .map((c) => toCredit(c, "Director"))
        .sort(byYearDesc);

      return NextResponse.json({
        id: d.id,
        name: d.name,
        biography: d.biography || "",
        profile: d.profile_path ?? null,
        knownFor: d.known_for_department || "",
        birthday: d.birthday ?? null,
        deathday: d.deathday ?? null,
        placeOfBirth: d.place_of_birth ?? null,
        actingCredits,
        directingCredits,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      return NextResponse.json({ error: `Lookup failed: ${message}` }, { status: 502 });
    }
  }

  // Discover-list branch: curated browse rows for the public home page. Each
  // key maps to a TMDB collection; movie lists come back as trimmed cards and
  // the people list as {id,name,profile,knownFor}. No auth required.
  const list = url.searchParams.get("list")?.trim();
  if (list) {
    const MOVIE_LISTS: Record<string, string> = {
      now_playing: "/movie/now_playing?page=1",
      trending: "/trending/movie/week?page=1",
      top_rated: "/movie/top_rated?page=1",
      popular: "/movie/popular?page=1",
      upcoming: "/movie/upcoming?page=1",
    };
    const isPeople = list === "popular_people";
    const path = isPeople ? "/person/popular?page=1" : MOVIE_LISTS[list];
    if (!path) {
      return NextResponse.json({ error: `Unknown list "${list}".` }, { status: 400 });
    }
    try {
      const res = await fetch(`${TMDB}${path}`, { headers });
      if (!res.ok) return statusError(res.status);
      const data = await res.json();

      if (isPeople) {
        interface TmdbPerson {
          id: number;
          name: string;
          profile_path?: string | null;
          known_for_department?: string;
          known_for?: { title?: string; name?: string }[];
        }
        const results = ((data.results || []) as TmdbPerson[])
          .filter((p) => p.profile_path) // skip faceless entries — cards need a photo
          .slice(0, 16)
          .map((p) => ({
            id: p.id,
            name: p.name,
            profile: p.profile_path ?? null,
            knownFor: p.known_for_department || "",
            knownForTitles: (p.known_for || [])
              .map((k) => k.title || k.name || "")
              .filter(Boolean)
              .slice(0, 3),
          }));
        return NextResponse.json({ kind: "people", results });
      }

      const results = ((data.results || []) as TmdbApiResult[])
        .filter((r) => r.poster_path)
        .slice(0, 18)
        .map((r) => ({
          id: r.id,
          title: r.title,
          year: yearOf(r.release_date),
          poster: r.poster_path ?? null,
          rating: round1(r.vote_average),
          genre: firstGenre(r.genre_ids),
        }));
      return NextResponse.json({ kind: "movies", results });
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      return NextResponse.json({ error: `List failed: ${message}` }, { status: 502 });
    }
  }

  const q = url.searchParams.get("q")?.trim();
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
