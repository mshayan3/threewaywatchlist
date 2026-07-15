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

export interface WatchedRow {
  user_id: string;
  tmdb_id: number;
  title: string;
  year: string | null;
  poster: string | null;
  rating: number | null;
  genre: string | null;
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
