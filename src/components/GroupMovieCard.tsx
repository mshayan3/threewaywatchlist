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
    <li className="relative">
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
        <OverlayAvatars people={people} />
        <WatchCountBadge count={watchCount} />

        {movie.rating > 0 && (
          <div
            className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold text-[#f4eedf]"
            style={{ background: "var(--overlay)" }}
          >
            <span className="text-amber">★</span> {movie.rating.toFixed(1)}
          </div>
        )}
      </div>

      <div className="px-0.5 pt-3">
        <div className="clamp-2 min-h-[2.4em] text-[15px] font-semibold leading-[1.25]">{movie.title}</div>
        <div className="mb-3 mt-0.5 text-[13px] text-faint">{meta}</div>

        {iWatched ? (
          <div className="w-full cursor-default rounded-[9px] border border-border py-2.5 text-center text-[13.5px] font-semibold text-faint">
            ✓ Seen it
          </div>
        ) : isMine ? (
          <button
            onClick={handleRemoveFromMine}
            title={`Remove ${movie.title} from my watchlist`}
            className="group/rm w-full rounded-[9px] border border-border bg-chip py-2.5 text-center text-[13.5px] font-semibold text-chipink transition-colors hover:border-accent2 hover:text-text"
          >
            <span className="group-hover/rm:hidden">✓ On your list</span>
            <span className="hidden group-hover/rm:inline">✕ Remove from mine</span>
          </button>
        ) : (
          <button
            onClick={() => onAddToMine(movie)}
            title={`Add ${movie.title} to my watchlist`}
            className="w-full rounded-[9px] border border-border py-2.5 text-[13.5px] font-semibold text-text transition-colors hover:border-accent2"
          >
            + Add to your list
          </button>
        )}
      </div>
    </li>
  );
}
