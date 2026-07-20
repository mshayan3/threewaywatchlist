"use client";

import { useMemo, useState } from "react";
import SearchBar from "./SearchBar";
import PersonalMovieCard from "./PersonalMovieCard";
import SortMenu from "./SortMenu";
import { MovieGrid } from "./MovieRow";
import type { AppUser, PersonalMovie, TmdbResult, Verdict } from "@/lib/types";

interface DashboardProps {
  user: AppUser;
  watchlist: PersonalMovie[];
  watchedList: PersonalMovie[];
  onAdd: (r: TmdbResult) => void;
  onMarkWatched: (m: PersonalMovie) => void;
  onSetVerdict: (m: PersonalMovie, v: Verdict | null) => void;
  onRemoveFromWatchlist: (m: PersonalMovie) => void;
  onRemoveFromWatched: (m: PersonalMovie) => void;
}

const byNewest = (a: PersonalMovie, b: PersonalMovie) =>
  new Date(b.at).getTime() - new Date(a.at).getTime();
const byRating = (a: PersonalMovie, b: PersonalMovie) =>
  (b.rating || 0) - (a.rating || 0) || a.title.localeCompare(b.title);
const byTitle = (a: PersonalMovie, b: PersonalMovie) => a.title.localeCompare(b.title);

type View = "watchlist" | "watched";
type Sort = "newest" | "rating" | "title";
const SORTERS: Record<Sort, (a: PersonalMovie, b: PersonalMovie) => number> = {
  newest: byNewest,
  rating: byRating,
  title: byTitle,
};
const SORT_OPTIONS = [
  { value: "newest" as Sort, label: "Newest" },
  { value: "rating" as Sort, label: "Rating" },
  { value: "title" as Sort, label: "A–Z" },
];

export default function Dashboard({
  user,
  watchlist,
  watchedList,
  onAdd,
  onMarkWatched,
  onSetVerdict,
  onRemoveFromWatchlist,
  onRemoveFromWatched,
}: DashboardProps) {
  const [view, setView] = useState<View>("watchlist");
  const [sort, setSort] = useState<Sort>("newest");

  const cmp = SORTERS[sort];
  const toWatch = useMemo(() => [...watchlist].sort(cmp), [watchlist, cmp]);
  const watched = useMemo(() => [...watchedList].sort(cmp), [watchedList, cmp]);
  const watchlistIds = useMemo(
    () => new Set(watchlist.map((m) => String(m.tmdbId))),
    [watchlist]
  );
  const watchedIds = useMemo(
    () => new Set(watchedList.map((m) => String(m.tmdbId))),
    [watchedList]
  );

  const firstName = user.name.split(/\s+/)[0];
  const active = view === "watchlist" ? toWatch : watched;

  return (
    <div className="view-anim">
      <h1 className="m-0 mb-1.5 font-display text-[clamp(26px,4vw,38px)] font-semibold tracking-[-0.02em]">
        Hey {firstName} 👋
      </h1>
      <p className="m-0 mb-8 text-[15.5px] text-dim">
        Everything you add here lands in your groups&apos; shared lists.
      </p>

      <div className="mb-9 max-w-[640px]">
        <SearchBar
          watchlistIds={watchlistIds}
          watchedIds={watchedIds}
          onAdd={onAdd}
          placeholder="Add a movie to your watchlist…"
        />
      </div>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-3 border-b border-line">
        <Tabs
          value={view}
          onChange={setView}
          options={[
            { key: "watchlist", label: "Watchlist", count: toWatch.length },
            { key: "watched", label: "Watched", count: watched.length },
          ]}
        />
        <div className="pb-3">
          <SortMenu value={sort} onChange={setSort} options={SORT_OPTIONS} />
        </div>
      </div>

      {active.length > 0 ? (
        <MovieGrid>
          {view === "watchlist"
            ? active.map((m) => (
                <PersonalMovieCard
                  key={m.tmdbId}
                  movie={m}
                  variant="watchlist"
                  onMarkWatched={onMarkWatched}
                  onRemove={onRemoveFromWatchlist}
                />
              ))
            : active.map((m) => (
                <PersonalMovieCard
                  key={m.tmdbId}
                  movie={m}
                  variant="watched"
                  onSetVerdict={onSetVerdict}
                  onRemove={onRemoveFromWatched}
                />
              ))}
        </MovieGrid>
      ) : (
        <p className="rounded-[var(--radius)] border border-dashed border-border px-4 py-10 text-center text-[.95rem] text-faint">
          {view === "watchlist"
            ? "Nothing here yet — search above to add movies."
            : "Nothing watched yet. Mark movies as seen and they'll move here."}
        </p>
      )}
    </div>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string; count?: number }[];
}) {
  return (
    <div className="flex gap-6 sm:gap-8">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className={
              "-mb-px flex items-center gap-2.5 pb-3.5 text-[16px] transition-colors " +
              (active
                ? "border-b-2 border-text font-semibold text-text"
                : "border-b-2 border-transparent font-medium text-faint hover:text-text")
            }
          >
            {o.label}
            {o.count != null && (
              <span
                className={
                  active
                    ? "rounded-full bg-chip px-2.5 py-0.5 text-[12.5px] font-bold text-dim"
                    : "text-[12.5px] font-bold text-muted2"
                }
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
