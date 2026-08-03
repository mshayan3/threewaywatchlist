"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMyGroups } from "@/lib/useMyGroups";
import { usePersonalLists } from "@/lib/usePersonalLists";
import { useSuggestions } from "@/lib/useSuggestions";
import { posterGradient } from "@/lib/helpers";
import type { AppUser, PersonalMovie, TmdbResult } from "@/lib/types";

type Personal = ReturnType<typeof usePersonalLists>;

const byNewest = (a: PersonalMovie, b: PersonalMovie) =>
  new Date(b.at).getTime() - new Date(a.at).getTime();

// A recommendation is a corpus movie, not a personal-list row; reshape it into
// the TmdbResult the personal-list mutations expect.
const asResult = (m: PersonalMovie): TmdbResult => ({
  id: m.tmdbId,
  title: m.title,
  release_date: m.year,
  poster_path: m.poster,
  rating: m.rating,
  genre: m.genre,
});

export default function Home({ user, personal }: { user: AppUser; personal: Personal }) {
  const { myGroups } = useMyGroups(user);
  const {
    watchlist,
    watchedList,
    watchlistIds,
    watchedIds,
    markWatched,
    removeFromWatchlist,
    add,
    addToWatched,
  } = personal;
  const { suggestions, source, loading: recsLoading, refresh } = useSuggestions(user);

  const firstName = user.name.split(/\s+/)[0];
  const upNext = useMemo(() => [...watchlist].sort(byNewest), [watchlist]);
  const unrated = useMemo(() => watchedList.filter((m) => !m.verdict).length, [watchedList]);

  // The recommendation deck: engine suggestions the user hasn't already queued
  // or seen. Falls back to echoing the watchlist until the corpus is built (or
  // for a brand-new account with nothing to recommend yet).
  const recs = useMemo(
    () => suggestions.filter((m) => !watchlistIds.has(m.tmdbId) && !watchedIds.has(m.tmdbId)),
    [suggestions, watchlistIds, watchedIds]
  );
  const usingRecs = recs.length > 0;
  const deck = usingRecs ? recs : upNext;

  // "Not now" cycles to the next deck title without leaving the page; clicking a
  // queue row features that watchlist title instead.
  const [cursor, setCursor] = useState(0);
  const idx = deck.length ? cursor % deck.length : 0;
  const hero = deck[idx];

  // The queue is always the watchlist (in line to watch), minus whatever the
  // deck is currently featuring when we're echoing the watchlist.
  const queue = useMemo(
    () => (usingRecs ? upNext : upNext.filter((_, i) => i !== idx)),
    [usingRecs, upNext, idx]
  );

  const hint = usingRecs
    ? source === "cold"
      ? "popular picks to start you off"
      : "picked from your taste"
    : "from your watchlist";

  return (
    <div className="view-anim">
      <h1 className="m-0 mb-1.5 font-display text-[clamp(24px,3.4vw,32px)] font-semibold tracking-[-0.02em]">
        Hey {firstName} 👋
      </h1>
      <p className="m-0 mb-7 text-[15px] text-dim">
        Everything you add here lands in your groups&apos; shared lists.
      </p>

      {/* Stats strip */}
      <div className="mb-9 grid max-w-[560px] grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile value={String(watchlist.length)} label="On watchlist" href="/watchlist" />
        {unrated > 0 ? (
          <StatTile
            value={`Rate ${unrated} film${unrated === 1 ? "" : "s"} →`}
            label="clear your backlog"
            href="/watched"
            accent
          />
        ) : (
          <StatTile value={String(watchedList.length)} label="Films watched" href="/watched" />
        )}
        <StatTile
          value={String(myGroups.length)}
          label={`In ${myGroups.length === 1 ? "group" : "groups"}`}
          href="/groups"
        />
      </div>

      {hero ? (
        <div className="grid gap-9 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:gap-12">
          {/* Recommendation deck */}
          <section>
            <SectionHead
              title="Recommended"
              hint={hint}
              action={
                usingRecs
                  ? { onClick: refresh, label: recsLoading ? "Refreshing…" : "Refresh" }
                  : undefined
              }
            />
            <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
              <HeroPoster movie={hero} />
              <div className="flex flex-1 flex-col gap-3">
                <div>
                  <div className="font-display text-[26px] font-bold leading-[1.08] tracking-[-0.01em] text-text">
                    {hero.title}
                  </div>
                  <div className="mt-1 text-[14.5px] text-dim">
                    {[hero.year, hero.genre].filter(Boolean).join(" · ") ||
                      (usingRecs ? "Recommended for you" : "On your watchlist")}
                  </div>
                </div>
                <div className="h-px bg-line" />

                {usingRecs ? (
                  <>
                    <div className="flex gap-2.5">
                      <button
                        onClick={() => add(asResult(hero))}
                        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-accent text-[14px] font-bold text-accent-text transition-transform active:scale-[.98]"
                      >
                        <PlusIcon />
                        Add to watchlist
                      </button>
                      <button
                        onClick={() => addToWatched(asResult(hero))}
                        className="h-11 flex-1 rounded-[10px] border border-border text-[14px] font-bold text-text transition-colors hover:border-accent2"
                      >
                        Seen it
                      </button>
                    </div>
                    <button
                      onClick={() => setCursor((c) => c + 1)}
                      disabled={deck.length < 2}
                      className="h-11 rounded-[10px] text-[14px] font-bold text-faint transition-colors hover:text-text disabled:opacity-45"
                    >
                      Not now
                    </button>
                    <p className="text-[12.5px] leading-[1.5] text-faint">
                      Add to watchlist → queues it for you and your groups · Seen it →
                      straight to Watched · Not now → next suggestion.
                    </p>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => markWatched(hero)}
                      className="flex h-11 items-center justify-center gap-2 rounded-[10px] bg-accent text-[14px] font-bold text-accent-text transition-transform active:scale-[.98]"
                    >
                      <CheckIcon />
                      Mark watched
                    </button>
                    <div className="flex gap-2.5">
                      <button
                        onClick={() => setCursor((c) => c + 1)}
                        disabled={deck.length < 2}
                        className="h-11 flex-1 rounded-[10px] border border-border text-[14px] font-bold text-text transition-colors hover:border-accent2 disabled:opacity-45"
                      >
                        Not now
                      </button>
                      <button
                        onClick={() => removeFromWatchlist(hero)}
                        className="h-11 flex-1 rounded-[10px] text-[14px] font-bold text-faint transition-colors hover:text-text"
                      >
                        Remove
                      </button>
                    </div>
                    <p className="text-[12.5px] leading-[1.5] text-faint">
                      Mark watched → moves it to Watched and opens your rating · Not now → back
                      of the deck for today.
                    </p>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* In your queue — the watchlist, in line */}
          <section className="flex min-w-0 flex-col">
            <SectionHead
              title="In your queue"
              action={
                queue.length > 0 ? { href: "/watchlist", label: "View all →" } : undefined
              }
            />
            {queue.length > 0 ? (
              <ul className="flex max-h-[560px] list-none flex-col gap-2.5 overflow-y-auto p-0 pr-0.5">
                {queue.map((m) => (
                  <QueueRow
                    key={m.tmdbId}
                    movie={m}
                    onClick={() => {
                      if (!usingRecs) setCursor(upNext.indexOf(m));
                    }}
                    interactive={!usingRecs}
                  />
                ))}
              </ul>
            ) : (
              <div className="rounded-[14px] border border-dashed border-border px-5 py-10 text-center text-[13.5px] text-faint">
                Your watchlist is empty — add something from a suggestion or search.
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-[16px] border border-dashed border-border px-6 py-14 text-center">
          <div
            className="aspect-[2/3] w-14 rounded-[6px] opacity-40"
            style={{ background: posterGradient("empty") }}
          />
          <div className="font-display text-[17px] font-semibold text-text">
            {recsLoading ? "Finding films for you…" : "Nothing to recommend yet"}
          </div>
          <p className="m-0 max-w-[300px] text-[14px] text-dim">
            Mark a few films watched and your recommendations will sharpen — or find
            something to start your watchlist.
          </p>
          <Link
            href="/catch-up"
            className="mt-1 rounded-[10px] bg-accent px-5 py-3 text-[14px] font-bold text-accent-text transition-transform active:scale-95"
          >
            Catch up on films
          </Link>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- pieces */

function SectionHead({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: { href: string; label: string } | { onClick: () => void; label: string };
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <div className="flex items-baseline gap-2.5">
        <h2 className="m-0 font-display text-[20px] font-bold tracking-[-0.01em]">{title}</h2>
        {hint && <span className="text-[14px] text-dim">{hint}</span>}
      </div>
      {action &&
        ("href" in action ? (
          <Link
            href={action.href}
            className="flex-none text-[13.5px] font-semibold text-accent2 transition-opacity hover:opacity-80"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="flex-none text-[13.5px] font-semibold text-accent2 transition-opacity hover:opacity-80"
          >
            {action.label}
          </button>
        ))}
    </div>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.9l-5.81 3.06 1.11-6.47-4.7-4.58 6.5-.95L12 2.5z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Amber star + one-decimal TMDB rating, in a subtle chip. Renders nothing for
// unrated (0) titles so a missing score doesn't show as "0.0".
function RatingChip({ value }: { value: number }) {
  if (!value) return null;
  return (
    <span className="flex flex-none items-center gap-1 rounded-full bg-chip px-2 py-1 text-[12.5px] font-bold text-text">
      <StarIcon className="h-3 w-3 text-amber" />
      {value.toFixed(1)}
    </span>
  );
}

function QueueRow({
  movie,
  onClick,
  interactive,
}: {
  movie: PersonalMovie;
  onClick: () => void;
  interactive: boolean;
}) {
  const hasPoster = !!movie.poster;
  const poster = hasPoster ? `https://image.tmdb.org/t/p/w185${movie.poster}` : "";
  const meta = [movie.year, movie.genre].filter(Boolean).join(" · ");
  const inner = (
    <>
      <span
        className="relative aspect-[2/3] w-10 flex-none overflow-hidden rounded-[6px] border border-line"
        style={hasPoster ? undefined : { background: posterGradient(movie.tmdbId) }}
      >
        {hasPoster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" className="h-full w-full object-cover" />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[14.5px] font-semibold text-text">{movie.title}</span>
        {meta && <span className="truncate text-[12.5px] text-faint">{meta}</span>}
      </span>
      <RatingChip value={movie.rating} />
    </>
  );
  return (
    <li>
      {interactive ? (
        <button
          onClick={onClick}
          title={`Feature “${movie.title}”`}
          className="flex w-full items-center gap-3 rounded-[12px] border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-accent2"
        >
          {inner}
        </button>
      ) : (
        <div className="flex w-full items-center gap-3 rounded-[12px] border border-border bg-surface px-3 py-2.5 text-left">
          {inner}
        </div>
      )}
    </li>
  );
}

function StatTile({
  value,
  label,
  href,
  accent,
}: {
  value: string;
  label: string;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "flex min-h-[74px] flex-col justify-center gap-0.5 rounded-[12px] border px-4 py-3 transition-colors " +
        (accent
          ? "border-accent2 bg-surface hover:bg-surface2"
          : "border-border bg-surface hover:border-accent2")
      }
    >
      <span
        className={
          "font-display font-bold tracking-[-0.01em] " +
          (accent ? "text-[15px] text-accent2" : "text-[20px] text-text")
        }
      >
        {value}
      </span>
      <span className={"text-[12.5px] " + (accent ? "text-accent2" : "text-faint")}>{label}</span>
    </Link>
  );
}

function HeroPoster({ movie }: { movie: PersonalMovie }) {
  const hasPoster = !!movie.poster;
  const poster = hasPoster ? `https://image.tmdb.org/t/p/w500${movie.poster}` : "";
  return (
    <div
      className="relative aspect-[2/3] w-full max-w-[300px] flex-none self-start overflow-hidden rounded-[10px] border border-line"
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
      {movie.rating > 0 && (
        <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[12.5px] font-bold text-white backdrop-blur">
          <StarIcon className="h-3 w-3 text-amber" />
          {movie.rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
