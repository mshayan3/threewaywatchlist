"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePersonalLists } from "@/lib/usePersonalLists";
import { useSuggestions } from "@/lib/useSuggestions";
import { posterGradient } from "@/lib/helpers";
import Spinner from "./Spinner";
import type { AppUser, PersonalMovie, TmdbResult } from "@/lib/types";

type Personal = ReturnType<typeof usePersonalLists>;

const asResult = (m: PersonalMovie): TmdbResult => ({
  id: m.tmdbId,
  title: m.title,
  release_date: m.year,
  poster_path: m.poster,
  rating: m.rating,
  genre: m.genre,
});

// Letterboxd-style onboarding: rip through a stack of suggested films, sending
// each to the watchlist or straight to watched (or skipping it). Runs on the
// same cached `recommendations` as Home — which cold-starts to popularity-by-
// genre for a brand-new account with no watch history.
export default function CatchUp({ user, personal }: { user: AppUser; personal: Personal }) {
  const { watchlistIds, watchedIds, add, addToWatched } = personal;
  const { suggestions, source, loading, refresh } = useSuggestions(user, 48);

  // Locally-skipped ids leave the stack immediately (no server round-trip).
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [added, setAdded] = useState(0);

  // What's left to triage: suggestions the user hasn't queued, seen, or skipped.
  const stack = useMemo(
    () =>
      suggestions.filter(
        (m) => !watchlistIds.has(m.tmdbId) && !watchedIds.has(m.tmdbId) && !skipped.has(m.tmdbId)
      ),
    [suggestions, watchlistIds, watchedIds, skipped]
  );

  const [cursor, setCursor] = useState(0);
  const idx = stack.length ? cursor % stack.length : 0;
  const hero = stack[idx];

  const feature = (m: PersonalMovie) => setCursor(stack.indexOf(m));
  const skip = () => setCursor((c) => c + 1);
  const toWatchlist = (m: PersonalMovie) => {
    add(asResult(m));
    setAdded((n) => n + 1);
  };
  const toWatched = (m: PersonalMovie) => {
    addToWatched(asResult(m));
    setAdded((n) => n + 1);
  };

  const subtitle =
    source === "cold"
      ? "Popular films to kick-start your lists — add what you like."
      : "Films matched to your taste — triage them into your lists.";

  return (
    <div className="view-anim">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 mb-1.5 font-display text-[clamp(24px,3.4vw,32px)] font-semibold tracking-[-0.02em]">
            Catch up
          </h1>
          <p className="m-0 max-w-[520px] text-[15px] text-dim">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3 text-[13.5px] text-faint">
          {added > 0 && (
            <span className="font-semibold text-text">
              {added} added
            </span>
          )}
          <button
            onClick={refresh}
            className="rounded-[10px] border border-border px-3.5 py-2 font-semibold text-text transition-colors hover:border-accent2"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {loading && stack.length === 0 ? (
        <Spinner />
      ) : hero ? (
        <>
          {/* Featured card */}
          <div className="flex flex-col gap-7 rounded-[18px] border border-border bg-surface p-6 sm:flex-row sm:gap-8 sm:p-7">
            <HeroPoster movie={hero} />
            <div className="flex flex-1 flex-col">
              <div className="font-display text-[28px] font-bold leading-[1.06] tracking-[-0.01em] text-text">
                {hero.title}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[14.5px] text-dim">
                {[hero.year, hero.genre].filter(Boolean).join(" · ") || "Recommended for you"}
                {hero.rating > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-chip px-2 py-0.5 text-[12.5px] font-bold text-text">
                    <StarIcon className="h-3 w-3 text-amber" />
                    {hero.rating.toFixed(1)}
                  </span>
                )}
              </div>

              <div className="mt-auto flex flex-col gap-2.5 pt-6">
                <button
                  onClick={() => toWatchlist(hero)}
                  className="flex h-12 items-center justify-center gap-2 rounded-[11px] bg-accent text-[15px] font-bold text-accent-text transition-transform active:scale-[.98]"
                >
                  <PlusIcon />
                  Add to watchlist
                </button>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => toWatched(hero)}
                    className="h-11 flex-1 rounded-[11px] border border-border text-[14px] font-bold text-text transition-colors hover:border-accent2"
                  >
                    Already seen it
                  </button>
                  <button
                    onClick={skip}
                    disabled={stack.length < 2}
                    className="h-11 flex-1 rounded-[11px] text-[14px] font-bold text-faint transition-colors hover:text-text disabled:opacity-45"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Filmstrip of what's next */}
          {stack.length > 1 && (
            <div className="mt-8">
              <div className="mb-3 text-[13px] font-semibold uppercase tracking-[0.03em] text-faint">
                Up next · {stack.length - 1}
              </div>
              <ul className="flex list-none gap-3 overflow-x-auto p-0 pb-2">
                {stack
                  .filter((_, i) => i !== idx)
                  .slice(0, 24)
                  .map((m) => (
                    <FilmstripCard key={m.tmdbId} movie={m} onClick={() => feature(m)} />
                  ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-[16px] border border-dashed border-border px-6 py-16 text-center">
          <div className="font-display text-[18px] font-semibold text-text">
            {added > 0 ? "All caught up 🎬" : "Nothing to catch up on yet"}
          </div>
          <p className="m-0 max-w-[320px] text-[14px] text-dim">
            {added > 0
              ? "You've triaged every suggestion. Come back after you've watched a few — the picks keep learning."
              : "Once the film catalog is built, popular and taste-matched picks show up here."}
          </p>
          <Link
            href="/home"
            className="mt-1 rounded-[10px] bg-accent px-5 py-3 text-[14px] font-bold text-accent-text transition-transform active:scale-95"
          >
            Back to home
          </Link>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- pieces */

function HeroPoster({ movie }: { movie: PersonalMovie }) {
  const hasPoster = !!movie.poster;
  const poster = hasPoster ? `https://image.tmdb.org/t/p/w500${movie.poster}` : "";
  return (
    <div
      className="relative aspect-[2/3] w-full max-w-[260px] flex-none self-center overflow-hidden rounded-[12px] border border-line sm:self-start"
      style={{
        boxShadow: "var(--card-shadow)",
        ...(hasPoster ? {} : { background: posterGradient(movie.tmdbId) }),
      }}
    >
      {hasPoster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt={`Poster for ${movie.title}`} className="h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center px-4 text-center font-display text-[22px] font-semibold uppercase leading-[1.05] tracking-wide text-white/90">
          {movie.title}
        </div>
      )}
    </div>
  );
}

function FilmstripCard({ movie, onClick }: { movie: PersonalMovie; onClick: () => void }) {
  const hasPoster = !!movie.poster;
  const poster = hasPoster ? `https://image.tmdb.org/t/p/w185${movie.poster}` : "";
  return (
    <li className="flex-none">
      <button
        onClick={onClick}
        title={`Feature “${movie.title}”`}
        className="group flex w-[110px] flex-col gap-1.5 text-left"
      >
        <span
          className="relative aspect-[2/3] w-full overflow-hidden rounded-[9px] border border-line transition-transform group-hover:-translate-y-1 group-hover:border-accent2"
          style={hasPoster ? undefined : { background: posterGradient(movie.tmdbId) }}
        >
          {hasPoster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="absolute inset-0 grid place-items-center px-2 text-center font-display text-[12px] font-semibold uppercase leading-tight text-white/90">
              {movie.title}
            </span>
          )}
        </span>
        <span className="truncate text-[12.5px] font-semibold text-text">{movie.title}</span>
      </button>
    </li>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.9l-5.81 3.06 1.11-6.47-4.7-4.58 6.5-.95L12 2.5z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
