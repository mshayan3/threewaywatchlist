"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PersonalMovieCard from "./PersonalMovieCard";
import SortMenu from "./SortMenu";
import { MovieGrid } from "./MovieRow";
import type { PersonalMovie, Verdict } from "@/lib/types";

const byNewest = (a: PersonalMovie, b: PersonalMovie) =>
  new Date(b.at).getTime() - new Date(a.at).getTime();
const byRating = (a: PersonalMovie, b: PersonalMovie) =>
  (b.rating || 0) - (a.rating || 0) || a.title.localeCompare(b.title);
const byTitle = (a: PersonalMovie, b: PersonalMovie) => a.title.localeCompare(b.title);

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

export default function WatchlistView({
  watchlist,
  onMarkWatched,
  onRemove,
}: {
  watchlist: PersonalMovie[];
  onMarkWatched: (m: PersonalMovie) => void;
  onSetVerdict?: (m: PersonalMovie, v: Verdict | null) => void;
  onRemove: (m: PersonalMovie) => void;
}) {
  const [sort, setSort] = useState<Sort>("newest");
  const items = useMemo(() => [...watchlist].sort(SORTERS[sort]), [watchlist, sort]);

  return (
    <div className="view-anim">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 mb-1 font-display text-[clamp(24px,3.4vw,32px)] font-semibold tracking-[-0.02em]">
            Watchlist
          </h1>
          <p className="m-0 text-[14px] text-dim">
            {watchlist.length} {watchlist.length === 1 ? "film" : "films"} saved to watch
          </p>
        </div>
        {items.length > 0 && <SortMenu value={sort} onChange={setSort} options={SORT_OPTIONS} />}
      </div>

      {items.length > 0 ? (
        <MovieGrid>
          {items.map((m) => (
            <PersonalMovieCard
              key={m.tmdbId}
              movie={m}
              variant="watchlist"
              onMarkWatched={onMarkWatched}
              onRemove={onRemove}
            />
          ))}
        </MovieGrid>
      ) : (
        <EmptyWatchlist />
      )}
    </div>
  );
}

function EmptyWatchlist() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[16px] border border-dashed border-border px-6 py-16 text-center">
      <div className="font-display text-[17px] font-semibold text-text">
        Your watchlist is empty
      </div>
      <p className="m-0 max-w-[300px] text-[14px] text-dim">Films you save show up here.</p>
      <Link
        href="/search"
        className="mt-1 rounded-[10px] bg-accent px-5 py-3 text-[14px] font-bold text-accent-text transition-transform active:scale-95"
      >
        Find a film
      </Link>
    </div>
  );
}
