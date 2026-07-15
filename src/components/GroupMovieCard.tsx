"use client";

import { colorFor, initials, posterGradient } from "@/lib/helpers";
import WatchCountBadge from "@/components/WatchCountBadge";
import { useConfirm } from "@/components/ConfirmDialog";
import type { GroupMovie, MoviePerson } from "@/lib/types";

interface GroupMovieCardProps {
  movie: GroupMovie;
  // "common" = nobody has watched it; "watched" = at least one member has.
  variant: "common" | "watched";
  isMine: boolean; // already on the caller's personal watchlist
  iWatched: boolean; // caller has personally watched it
  watchCount: number; // caller's own watch count for this movie (0 = never)
  onAddToMine: (m: GroupMovie) => void;
  onRemoveFromMine: (m: GroupMovie) => void;
}

function OverlayAvatars({ people }: { people: MoviePerson[] }) {
  if (people.length === 0) return null;
  return (
    <div className="absolute left-3.5 top-3 flex">
      {people.slice(0, 4).map((p) => (
        <span
          key={p.user_id}
          className="-ml-1.5 grid h-6 w-6 flex-none place-items-center overflow-hidden rounded-full text-[9px] font-extrabold text-white"
          style={{
            background: p.avatar_url ? undefined : colorFor(p.name),
            border: "2px solid rgba(0,0,0,.3)",
          }}
          title={p.name || "…"}
        >
          {p.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(p.name)
          )}
        </span>
      ))}
    </div>
  );
}

export default function GroupMovieCard({
  movie,
  variant,
  isMine,
  iWatched,
  watchCount,
  onAddToMine,
  onRemoveFromMine,
}: GroupMovieCardProps) {
  const confirmDialog = useConfirm();
  const hasPoster = !!movie.poster;
  const poster = hasPoster ? `https://image.tmdb.org/t/p/w300${movie.poster}` : "";
  const meta = [movie.year, movie.genre].filter(Boolean).join(" · ");
  const people = variant === "common" ? movie.queuedBy : movie.watchedBy;

  const handleRemoveFromMine = async () => {
    const ok = await confirmDialog({
      title: `Remove "${movie.title}" from your watchlist?`,
      message: "It stays in the group's list if other members still want it.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (ok) onRemoveFromMine(movie);
  };

  return (
    <li
      className="relative rounded-[24px] border border-border bg-surface transition-transform duration-200 hover:-translate-y-1.5"
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
        <OverlayAvatars people={people} />
        <WatchCountBadge count={watchCount} />
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
        <div className="clamp-2 min-h-[2.4em] text-[15px] font-bold leading-[1.2]">{movie.title}</div>
        <div className="mb-3 mt-0.5 text-[12.5px] text-dim">{meta}</div>

        {iWatched ? (
          <div className="w-full cursor-default rounded-[14px] border border-border bg-transparent py-2.5 text-center text-[13px] font-bold text-dim">
            ✓ Seen it
          </div>
        ) : isMine ? (
          <button
            onClick={handleRemoveFromMine}
            title={`Remove ${movie.title} from my watchlist`}
            className="group/rm w-full rounded-[14px] border border-border bg-transparent py-2.5 text-center text-[13px] font-bold text-dim transition-colors hover:border-accent2 hover:text-accent2"
          >
            <span className="group-hover/rm:hidden">✓ On your list</span>
            <span className="hidden group-hover/rm:inline">✕ Remove from mine</span>
          </button>
        ) : (
          <button
            onClick={() => onAddToMine(movie)}
            title={`Add ${movie.title} to my watchlist`}
            className="w-full rounded-[14px] bg-accent2 py-2.5 text-[13px] font-bold text-white transition-transform active:scale-95"
          >
            + Add to mine
          </button>
        )}
      </div>
    </li>
  );
}
