"use client";

import { useMemo, useState } from "react";
import SearchBar from "./SearchBar";
import PersonalMovieCard from "./PersonalMovieCard";
import SortMenu from "./SortMenu";
import { Count, CardGrid } from "./MovieRow";
import type { AppUser, PersonalMovie, TmdbResult } from "@/lib/types";

interface DashboardProps {
  user: AppUser;
  watchlist: PersonalMovie[];
  watchedList: PersonalMovie[];
  onAdd: (r: TmdbResult) => void;
  onAddToWatched: (r: TmdbResult) => void;
  onMarkWatched: (m: PersonalMovie) => void;
  onMoveToWatchlist: (m: PersonalMovie) => void;
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
  onAddToWatched,
  onMarkWatched,
  onMoveToWatchlist,
  onRemoveFromWatchlist,
  onRemoveFromWatched,
}: DashboardProps) {
  const [view, setView] = useState<View>("watchlist");
  const [sort, setSort] = useState<Sort>("newest");

  const cmp = SORTERS[sort];
  const toWatch = useMemo(() => [...watchlist].sort(cmp), [watchlist, cmp]);
  const watched = useMemo(() => [...watchedList].sort(cmp), [watchedList, cmp]);
  // Search "Add" files into whichever list is open (watchlist vs watched).
  const handleAdd = view === "watched" ? onAddToWatched : onAdd;
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
    <>
    <main className="view-anim relative z-[2] mx-auto max-w-[1000px] px-4 pt-4 sm:px-6">
      <h1 className="m-0 mb-1.5 font-display text-[clamp(26px,4vw,34px)] font-extrabold tracking-[-0.02em]">
        Hey {firstName} 👋
      </h1>
      <p className="m-0 mb-6 text-[15px] text-dim">
        Your personal watchlist. Everything here is pooled into the groups you belong to.
      </p>

      <SearchBar
        watchlistIds={watchlistIds}
        watchedIds={watchedIds}
        onAdd={handleAdd}
        placeholder={
          view === "watched"
            ? "Add a movie to your watched list…"
            : "Add a movie to your watchlist…"
        }
      />

      <div className="mb-1 flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex items-center gap-2.5">
          <h2 className="m-0 font-display text-[21px] font-bold">
            {view === "watchlist" ? "My watchlist" : "Watched"}
          </h2>
          <Count>{active.length}</Count>
        </div>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            ["watchlist", "Watchlist"],
            ["watched", "Watched"],
          ]}
        />
      </div>
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-[13.5px] text-faint">
          {view === "watchlist" ? "Movies you want to see." : "Movies you've already seen."}
        </p>
        <SortMenu value={sort} onChange={setSort} options={SORT_OPTIONS} />
      </div>

      {active.length > 0 ? (
        <CardGrid>
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
                  onMoveToWatchlist={onMoveToWatchlist}
                  onRemove={onRemoveFromWatched}
                />
              ))}
        </CardGrid>
      ) : (
        <p className="rounded-[var(--radius)] border border-dashed border-border px-4 py-10 text-center text-[.95rem] text-faint">
          {view === "watchlist"
            ? "Nothing here yet — search above to add movies."
            : "Nothing watched yet. Mark movies as seen and they'll move here."}
        </p>
      )}

    </main>
      <Footer />
    </>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="flex gap-1 rounded-[13px] border border-border bg-chip p-[5px]">
      {options.map(([k, label]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={
            "rounded-[10px] px-[18px] py-2 text-[13.5px] font-bold transition-colors " +
            (value === k ? "bg-accent text-[var(--accent-text)]" : "bg-transparent text-dim hover:text-text")
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function Footer() {
  return (
    <footer
      className="fixed inset-x-0 bottom-0 z-[20] border-t border-border py-2.5 text-center text-[12px] text-faint backdrop-blur-md"
      style={{ background: "var(--glass)" }}
    >
      Movie data from{" "}
      <a
        href="https://www.themoviedb.org/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent2 hover:underline"
      >
        TMDB
      </a>{" "}
      · not endorsed or certified by TMDB.
    </footer>
  );
}
