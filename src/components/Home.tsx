"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMyGroups } from "@/lib/useMyGroups";
import { usePersonalLists } from "@/lib/usePersonalLists";
import { posterGradient } from "@/lib/helpers";
import type { AppUser, PersonalMovie } from "@/lib/types";

type Personal = ReturnType<typeof usePersonalLists>;

const byNewest = (a: PersonalMovie, b: PersonalMovie) =>
  new Date(b.at).getTime() - new Date(a.at).getTime();

export default function Home({ user, personal }: { user: AppUser; personal: Personal }) {
  const { myGroups } = useMyGroups(user);
  const { watchlist, watchedList, markWatched, removeFromWatchlist } = personal;

  const firstName = user.name.split(/\s+/)[0];
  const upNext = useMemo(() => [...watchlist].sort(byNewest), [watchlist]);
  const unrated = useMemo(() => watchedList.filter((m) => !m.verdict).length, [watchedList]);

  // "Not now" cycles to the next watchlist title without leaving the deck.
  const [cursor, setCursor] = useState(0);
  const idx = upNext.length ? cursor % upNext.length : 0;
  const hero = upNext[idx];

  return (
    <div className="view-anim">
      <h1 className="m-0 mb-1.5 font-display text-[clamp(24px,3.4vw,32px)] font-semibold tracking-[-0.02em]">
        Hey {firstName} 👋
      </h1>
      <p className="m-0 mb-7 text-[15px] text-dim">
        Everything you add here lands in your groups&apos; shared lists.
      </p>

      {/* Stats strip */}
      <div className="mb-9 grid grid-cols-1 gap-3 sm:grid-cols-3">
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

      {/* Recommendation deck — "up next" from the watchlist */}
      <div className="mb-4 flex items-baseline gap-2.5">
        <h2 className="m-0 font-display text-[20px] font-bold tracking-[-0.01em]">Up next</h2>
        {upNext.length > 0 && (
          <span className="text-[14px] text-dim">from your watchlist</span>
        )}
      </div>

      {hero ? (
        <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
          <HeroPoster movie={hero} />
          <div className="flex flex-1 flex-col gap-3">
            <div className="text-[15px] text-dim">
              {[hero.year, hero.genre].filter(Boolean).join(" · ") || "On your watchlist"}
            </div>
            <div className="h-px bg-line" />
            <button
              onClick={() => {
                markWatched(hero);
                setCursor((c) => c);
              }}
              className="flex h-12 items-center justify-center gap-2 rounded-[10px] bg-accent text-[14px] font-bold text-accent-text transition-transform active:scale-[.98]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Mark watched
            </button>
            <div className="flex gap-2.5">
              <button
                onClick={() => setCursor((c) => c + 1)}
                disabled={upNext.length < 2}
                className="h-12 flex-1 rounded-[10px] border border-border text-[14px] font-bold text-text transition-colors hover:border-accent2 disabled:opacity-45"
              >
                Not now
              </button>
              <button
                onClick={() => removeFromWatchlist(hero)}
                className="h-12 flex-1 rounded-[10px] text-[14px] font-bold text-faint transition-colors hover:text-text"
              >
                Remove
              </button>
            </div>
            <p className="text-[12.5px] leading-[1.5] text-faint">
              Mark watched → moves it to Watched and opens your rating · Not now → back
              of the deck for today.
            </p>
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col items-center gap-3 rounded-[16px] border border-dashed border-border px-6 py-14 text-center"
        >
          <div
            className="aspect-[2/3] w-14 rounded-[6px] opacity-40"
            style={{ background: posterGradient("empty") }}
          />
          <div className="font-display text-[17px] font-semibold text-text">
            Your watchlist is empty
          </div>
          <p className="m-0 max-w-[280px] text-[14px] text-dim">
            Films you save show up here, next in line to watch.
          </p>
          <Link
            href="/search"
            className="mt-1 rounded-[10px] bg-accent px-5 py-3 text-[14px] font-bold text-accent-text transition-transform active:scale-95"
          >
            Find a film
          </Link>
        </div>
      )}
    </div>
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
        "flex flex-col justify-center gap-1 rounded-[12px] border px-4 py-4 transition-colors " +
        (accent
          ? "border-accent2 bg-surface hover:bg-surface2"
          : "border-border bg-surface hover:border-accent2")
      }
    >
      <span
        className={
          "font-display font-bold tracking-[-0.01em] " +
          (accent ? "text-[16px] text-accent2" : "text-[22px] text-text")
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
      className="relative aspect-[2/3] w-full max-w-[250px] flex-none self-start overflow-hidden rounded-[10px] border border-line"
      style={{
        boxShadow: "var(--card-shadow)",
        ...(hasPoster ? {} : { background: posterGradient(movie.tmdbId) }),
      }}
    >
      {hasPoster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt={`Poster for ${movie.title}`} className="h-full w-full object-cover" />
      ) : null}
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-3.5"
        style={{ background: "linear-gradient(0deg, rgba(14,16,19,.85), transparent 60%)" }}
      >
        <div className="font-display text-[20px] font-semibold leading-[1.1] text-white/95">
          {movie.title}
        </div>
      </div>
    </div>
  );
}
