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
    <li
      className="group relative rounded-[24px] border border-border bg-surface transition-transform duration-200 hover:-translate-y-1.5"
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      <div
        className="relative mx-2 mt-2 aspect-square overflow-hidden rounded-[18px]"
        style={hasPoster ? undefined : { background: posterGradient(movie.tmdbId) }}
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
          <span className="absolute inset-0 flex items-center justify-center px-3 text-center font-display text-[17px] font-extrabold uppercase leading-[1.05] tracking-[0.04em] text-white/95">
            {movie.title}
          </span>
        )}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(circle at 28% 16%, rgba(255,255,255,.2), transparent 55%)" }}
        />
        <WatchCountBadge count={movie.watchCount} />
        <button
          onClick={handleRemove}
          title="Remove"
          aria-label={`Remove ${movie.title}`}
          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/70 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {movie.rating > 0 && (
        <div
          className="absolute right-4 top-0 -translate-y-[42%] rotate-6 rounded-[13px] bg-amber px-2.5 py-1.5 text-[12px] font-extrabold text-[#2a1e00]"
          style={{ boxShadow: "0 6px 16px rgba(0,0,0,.28)" }}
        >
          ★ {movie.rating.toFixed(1)}
        </div>
      )}

      <div className="px-3.5 pb-4 pt-3">
        <div className="clamp-2 text-[15px] font-bold leading-[1.2]">{movie.title}</div>
        <div className="mb-3 mt-0.5 text-[12.5px] text-dim">{meta}</div>

        {variant === "watchlist" ? (
          <button
            onClick={() => onMarkWatched?.(movie)}
            className="w-full rounded-[14px] bg-accent py-2.5 text-[13px] font-bold text-[var(--accent-text)] transition-transform active:scale-95"
          >
            ✓ Mark watched
          </button>
        ) : (
          <button
            onClick={() => onMoveToWatchlist?.(movie)}
            className="w-full rounded-[14px] border border-border bg-chip py-2.5 text-[13px] font-bold text-text transition-colors hover:border-accent"
          >
            ↺ Move to watchlist
          </button>
        )}
      </div>
    </li>
  );
}
