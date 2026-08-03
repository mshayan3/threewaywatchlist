"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PersonalMovieCard from "./PersonalMovieCard";
import SortMenu from "./SortMenu";
import { MovieGrid } from "./MovieRow";
import { StatBlock, ViewToggle, type ViewMode } from "./ListChrome";
import { posterGradient } from "@/lib/helpers";
import { useConfirm } from "./ConfirmDialog";
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
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<Sort>("newest");

  const topGenre = useMemo(() => {
    const tally = new Map<string, number>();
    for (const m of watchlist) {
      const g = (m.genre || "").split(/[,·]/)[0].trim();
      if (g) tally.set(g, (tally.get(g) || 0) + 1);
    }
    let best = "";
    let n = 0;
    for (const [g, k] of tally) if (k > n) ((best = g), (n = k));
    return best;
  }, [watchlist]);

  const items = useMemo(() => [...watchlist].sort(SORTERS[sort]), [watchlist, sort]);

  return (
    <div className="view-anim">
      <h1 className="m-0 mb-4 font-display text-[clamp(24px,3.4vw,32px)] font-semibold tracking-[-0.02em]">
        Watchlist
      </h1>

      {/* Stats block */}
      <StatBlock
        items={[
          `${watchlist.length} ${watchlist.length === 1 ? "film" : "films"}`,
          ...(topGenre ? [`Top genre · ${topGenre}`] : []),
        ]}
      />

      {items.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
          <SortMenu value={sort} onChange={setSort} options={SORT_OPTIONS} />
          <ViewToggle view={view} onChange={setView} />
        </div>
      )}

      {items.length === 0 ? (
        <EmptyWatchlist />
      ) : view === "grid" ? (
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
        <ul className="flex list-none flex-col gap-2 p-0">
          {items.map((m) => (
            <WatchlistRow
              key={m.tmdbId}
              movie={m}
              onMarkWatched={onMarkWatched}
              onRemove={onRemove}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// Compact list row for the "List" view: thumb · title/meta · mark-watched · remove.
function WatchlistRow({
  movie,
  onMarkWatched,
  onRemove,
}: {
  movie: PersonalMovie;
  onMarkWatched: (m: PersonalMovie) => void;
  onRemove: (m: PersonalMovie) => void;
}) {
  const confirmDialog = useConfirm();
  const hasPoster = !!movie.poster;
  const meta = [movie.year, movie.genre].filter(Boolean).join(" · ");

  const remove = async () => {
    const ok = await confirmDialog({
      title: `Remove "${movie.title}"?`,
      message: "This takes it off your watchlist.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (ok) onRemove(movie);
  };

  return (
    <li className="flex items-center gap-3.5 rounded-[12px] border border-line bg-surface px-3 py-2.5">
      {hasPoster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://image.tmdb.org/t/p/w92${movie.poster}`}
          alt=""
          className="h-[54px] w-9 flex-none rounded-[5px] object-cover"
        />
      ) : (
        <span
          className="h-[54px] w-9 flex-none rounded-[5px]"
          style={{ background: posterGradient(movie.tmdbId) }}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-semibold text-text">{movie.title}</div>
        <div className="truncate text-[12.5px] text-faint">{meta}</div>
      </div>
      <button
        onClick={() => onMarkWatched(movie)}
        className="flex flex-none items-center gap-1.5 rounded-[8px] border border-border px-3.5 py-2 text-[13px] font-semibold text-text transition-colors hover:border-accent2"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Mark watched
      </button>
      <button
        onClick={remove}
        aria-label={`Remove ${movie.title}`}
        className="grid h-8 w-8 flex-none place-items-center rounded-[7px] text-faint transition-colors hover:text-[var(--bad)]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
    </li>
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
