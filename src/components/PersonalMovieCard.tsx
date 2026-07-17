"use client";

import { posterGradient } from "@/lib/helpers";
import { useConfirm } from "@/components/ConfirmDialog";
import WatchCountBadge from "@/components/WatchCountBadge";
import type { PersonalMovie } from "@/lib/types";

interface PersonalMovieCardProps {
  movie: PersonalMovie;
  // "watchlist" shows Mark-watched; "watched" shows Move-back. Both show Remove.
  variant: "watchlist" | "watched";
  onMarkWatched?: (m: PersonalMovie) => void;
  onMoveToWatchlist?: (m: PersonalMovie) => void;
  onRemove: (m: PersonalMovie) => void;
}

export default function PersonalMovieCard({
  movie,
  variant,
  onMarkWatched,
  onMoveToWatchlist,
  onRemove,
}: PersonalMovieCardProps) {
  const confirmDialog = useConfirm();
  const hasPoster = !!movie.poster;
  const poster = hasPoster ? `https://image.tmdb.org/t/p/w300${movie.poster}` : "";
  const meta = [movie.year, movie.genre].filter(Boolean).join(" · ");

  const handleRemove = async () => {
    const ok = await confirmDialog({
      title: `Remove "${movie.title}"?`,
      message:
        variant === "watched"
          ? "This takes it off your watched list."
          : "This takes it off your watchlist.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (ok) onRemove(movie);
  };

  return (
    <li className="group relative">
      <div
        className="relative aspect-[2/3] overflow-hidden rounded-[13px] border border-line"
        style={{
          boxShadow: "var(--card-shadow)",
          ...(hasPoster ? {} : { background: posterGradient(movie.tmdbId) }),
        }}
      >
        {hasPoster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt={`Poster for ${movie.title}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="absolute inset-x-0 bottom-0 p-3.5 font-display text-[19px] font-semibold leading-[1.1] text-white/95">
            {movie.title}
          </span>
        )}

        {movie.rating > 0 && (
          <div
            className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold text-[#f4eedf]"
            style={{ background: "var(--overlay)" }}
          >
            <span className="text-amber">★</span> {movie.rating.toFixed(1)}
          </div>
        )}

        <WatchCountBadge count={movie.watchCount} />
        <button
          onClick={handleRemove}
          title="Remove"
          aria-label={`Remove ${movie.title}`}
          className="absolute left-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full text-white opacity-0 backdrop-blur-sm transition-opacity hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"
          style={{ background: "var(--overlay)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="px-0.5 pt-3">
        <div className="clamp-2 min-h-[2.4em] text-[15px] font-semibold leading-[1.25]">{movie.title}</div>
        <div className="mb-3 mt-0.5 text-[13px] text-faint">{meta}</div>

        {variant === "watchlist" ? (
          <button
            onClick={() => onMarkWatched?.(movie)}
            className="flex w-full items-center justify-center gap-1.5 rounded-[9px] border border-border py-2.5 text-[13.5px] font-semibold text-text transition-colors hover:border-accent2"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Mark watched
          </button>
        ) : (
          <button
            onClick={() => onMoveToWatchlist?.(movie)}
            className="flex w-full items-center justify-center gap-1.5 rounded-[9px] border border-border py-2.5 text-[13.5px] font-semibold text-dim transition-colors hover:border-accent2 hover:text-text"
          >
            ↺ Move to watchlist
          </button>
        )}
      </div>
    </li>
  );
}
