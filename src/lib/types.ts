// Shared types for the Threeway Watchlist app.

export interface AppUser {
  id: string;
  name: string; // effective display name (profile display_name → auth name)
  displayName?: string;
  nickname?: string;
  avatarUrl?: string | null;
  bio?: string;
}

// A group the user belongs to, as returned by the my_groups RPC.
export interface Group {
  code: string;
  name?: string;
  isOwner?: boolean;
  memberCount?: number;
  inviteToken?: string; // shareable invite-link token (owners can copy it)
}

export interface Member {
  user_id: string;
  user_name: string | null;
  name?: string | null; // effective display (profile nickname/display_name → user_name)
  avatar_url?: string | null;
}

// ---- personal (user-scoped) rows as stored in Supabase --------------------
export interface WatchlistRow {
  user_id: string;
  tmdb_id: number;
  title: string;
  year: string | null;
  poster: string | null;
  rating: number | null;
  genre: string | null;
  added_at: string;
}

// The user's personal take on a movie they've watched, distinct from the TMDB
// numeric rating. null = not yet rated.
export type Verdict = "good" | "ok" | "bad";

export interface WatchedRow {
  user_id: string;
  tmdb_id: number;
  title: string;
  year: string | null;
  poster: string | null;
  rating: number | null;
  genre: string | null;
  verdict: Verdict | null;
  watched_at: string;
}

// A personal-list movie shaped for rendering on the dashboard.
export interface PersonalMovie {
  tmdbId: number;
  title: string;
  year: string;
  poster: string;
  rating: number;
  genre: string;
  at: string; // added_at or watched_at
  watchCount: number; // times this user has watched it (0 = never)
  verdict?: Verdict | null; // personal good/ok/bad take (watched list only)
}

// A person referenced in a group movie's queued_by / watched_by lists.
export interface MoviePerson {
  user_id: string;
  name: string | null;
  avatar_url?: string | null;
}

// A movie in a group's DERIVED combined list (from the group_movies RPC).
export interface GroupMovie {
  tmdbId: number;
  title: string;
  year: string;
  poster: string;
  rating: number;
  genre: string;
  queuedBy: MoviePerson[];
  watchedBy: MoviePerson[];
}

// A film the group explicitly logged as watched TOGETHER (from the
// group_watched_movies RPC). Distinct from a member's personal watched list:
// this is a group-scoped fact with who marked it and when.
export interface GroupWatchedMovie {
  tmdbId: number;
  title: string;
  year: string;
  poster: string;
  rating: number;
  genre: string;
  watchedAt: string;
  markedBy: MoviePerson | null;
}

// A TMDB search result (subset of fields we use). rating + genre are resolved
// server-side in /api/tmdb from vote_average + genre_ids.
export interface TmdbResult {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  rating?: number;
  genre?: string;
}

// ---- movie / person detail (from /api/tmdb?movie= and ?person=) -----------

// A person as referenced from a movie's credits (director or cast member).
export interface CreditPerson {
  id: number;
  name: string;
  profilePath: string | null;
}

// A cast member additionally carries the character they played.
export interface CastCredit extends CreditPerson {
  character: string;
}

// Full movie detail for the description page. Shaped server-side in /api/tmdb
// from /movie/{id}?append_to_response=credits.
export interface MovieDetail {
  id: number;
  title: string;
  tagline: string;
  overview: string;
  year: string;
  releaseDate: string;
  runtime: number; // minutes (0 when unknown)
  rating: number;
  voteCount: number;
  genres: string[];
  poster: string | null;
  backdrop: string | null;
  directors: CreditPerson[];
  cast: CastCredit[];
}

// One film in a person's filmography. `role` is the character (acting credits)
// or the crew job (directing credits).
export interface PersonCredit {
  id: number; // movie id
  title: string;
  year: string;
  poster: string | null;
  rating: number;
  role: string;
}

// ---- discover-list cards (from /api/tmdb?list=) ---------------------------

// A movie card in a public browse row (In Theaters / Trending / Top Rated…).
export interface DiscoverMovie {
  id: number;
  title: string;
  year: string;
  releaseDate: string; // raw TMDB release_date; "" when unknown
  poster: string | null;
  rating: number;
  genre: string;
}

// A person card in the Popular People row.
export interface DiscoverPerson {
  id: number;
  name: string;
  profile: string | null;
  knownFor: string; // department, e.g. "Acting" / "Directing"
  knownForTitles: string[];
}

// Discriminated payload returned by ?list=. `kind` says how to read `results`.
export type DiscoverList =
  | { kind: "movies"; results: DiscoverMovie[] }
  | { kind: "people"; results: DiscoverPerson[] };

// Full person detail for the director/actor page. Shaped server-side in
// /api/tmdb from /person/{id}?append_to_response=movie_credits.
export interface PersonDetail {
  id: number;
  name: string;
  biography: string;
  profile: string | null;
  knownFor: string; // known_for_department, e.g. "Directing" / "Acting"
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
  actingCredits: PersonCredit[];
  directingCredits: PersonCredit[];
}
