"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchMovieDetail } from "@/lib/tmdb";
import { initials, posterGradient } from "@/lib/helpers";
import Spinner from "@/components/Spinner";
import { useConfirm } from "@/components/ConfirmDialog";
import { usePersonalLists } from "@/lib/usePersonalLists";
import type { AppUser, MovieDetail, PersonalMovie, TmdbResult } from "@/lib/types";

const img = (path: string | null, size: string) =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : "";

// Vertical alpha mask for the hero backdrop: fully opaque through the upper
// two-thirds, then dissolving to transparent so the image blends into the
// detail section below rather than cutting off on a hard edge.
const FADE =
  "linear-gradient(to bottom, #000 0%, #000 58%, rgba(0,0,0,0.55) 78%, transparent 100%)";

function formatRuntime(min: number): string {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

// A cast member tile — links through to that person's page.
function CastTile({ id, name, character, profilePath }: MovieDetail["cast"][number]) {
  const photo = img(profilePath, "w185");
  return (
    <Link
      href={`/person/${id}`}
      className="group/cast flex flex-col gap-2 rounded-[12px] border border-line bg-surface p-2 transition-colors hover:border-accent2"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-[9px]">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span
            className="grid h-full w-full place-items-center text-[22px] font-extrabold text-white/90"
            style={{ background: posterGradient(id) }}
          >
            {initials(name)}
          </span>
        )}
      </div>
      <div className="px-0.5">
        <div className="clamp-2 text-[13.5px] font-semibold leading-[1.2]">{name}</div>
        {character && <div className="mt-0.5 text-[12px] text-faint clamp-2">{character}</div>}
      </div>
    </Link>
  );
}

export default function MovieDetailView({
  id,
  user,
}: {
  id: string;
  user: AppUser | null;
}) {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Safe with a null user: the hook returns empty sets and no-op mutations.
  const { watchlistIds, watchedIds, add, markWatched, moveToWatchlist, removeFromWatchlist } =
    usePersonalLists(user);

  // Signed-out visitors can view everything; list actions send them to sign in.
  const gate = (fn: () => void) => () => (user ? fn() : router.push("/login"));

  useEffect(() => {
    let alive = true;
    setMovie(null);
    setError(null);
    fetchMovieDetail(id)
      .then((d) => alive && setMovie(d))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Failed to load"));
    return () => {
      alive = false;
    };
  }, [id]);

  if (error) {
    return (
      <div className="view-anim mx-auto max-w-[560px] py-20 text-center">
        <p className="m-0 text-[15px] text-faint">Couldn&apos;t load this film — {error}</p>
        <button
          onClick={() => router.back()}
          className="mt-5 rounded-[10px] border border-border px-4 py-2 text-[14px] font-semibold transition-colors hover:border-accent2"
        >
          ← Go back
        </button>
      </div>
    );
  }

  if (!movie) return <Spinner />;

  const numId = movie.id;
  const isMine = watchlistIds.has(numId);
  const iWatched = watchedIds.has(numId);

  const asResult = (): TmdbResult => ({
    id: movie.id,
    title: movie.title,
    release_date: movie.releaseDate,
    poster_path: movie.poster,
    rating: movie.rating,
    genre: movie.genres[0] || "",
  });
  const asPersonal = (): PersonalMovie => ({
    tmdbId: movie.id,
    title: movie.title,
    year: movie.year,
    poster: movie.poster || "",
    rating: movie.rating,
    genre: movie.genres[0] || "",
    at: "",
    watchCount: 0,
  });

  const handleRemove = async () => {
    const ok = await confirmDialog({
      title: `Remove "${movie.title}" from your watchlist?`,
      message: "This takes it off your watchlist.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (ok) removeFromWatchlist(asPersonal());
  };

  // Full-resolution backdrop (TMDB "original" size) so the hero graphic isn't
  // upscaled from a 1280px-wide copy on large / high-DPI displays.
  const backdrop = img(movie.backdrop, "original");
  const poster = img(movie.poster, "w342");
  const meta = [movie.year, formatRuntime(movie.runtime)].filter(Boolean);

  return (
    <div className="view-anim -mx-5 -mt-6 sm:-mx-8 sm:-mt-8 lg:-mx-14 lg:-mt-10">
      {/* Hero: backdrop with poster + primary info overlaid */}
      <div className="relative">
        {/* Backdrop layer — bleeds ~8rem past the hero and its own pixels fade
            to transparent (mask), so the image melts into the detail section
            instead of ending on a hard line. Theme-agnostic: the transparent
            tail reveals whatever page background sits behind it. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -bottom-32 overflow-hidden">
          {backdrop ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={backdrop}
              alt=""
              className="h-full w-full object-cover"
              style={{ maskImage: FADE, WebkitMaskImage: FADE }}
            />
          ) : (
            <div
              className="h-full w-full"
              style={{ background: posterGradient(movie.id), maskImage: FADE, WebkitMaskImage: FADE }}
            />
          )}
          {/* Legibility scrim for the white hero text; eases out above the fade. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,.52) 0%, rgba(0,0,0,.32) 42%, rgba(0,0,0,.12) 66%, rgba(0,0,0,0) 86%)",
            }}
          />
        </div>

        <div className="relative z-[1] px-5 pb-8 pt-6 sm:px-8 lg:px-14 lg:pt-10">
          <button
            onClick={() => router.back()}
            className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-black/35 px-3.5 py-1.5 text-[13px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/50"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-8">
            <div
              className="w-[150px] flex-none overflow-hidden rounded-[14px] border border-white/10 sm:w-[210px]"
              style={{ boxShadow: "var(--card-shadow-hover)" }}
            >
              <div className="relative aspect-[2/3]">
                {poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={poster} alt={`Poster for ${movie.title}`} className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="grid h-full w-full place-items-center p-4 text-center font-display text-[18px] font-semibold text-white/95"
                    style={{ background: posterGradient(movie.id) }}
                  >
                    {movie.title}
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1 text-white">
              <h1 className="m-0 font-display text-[clamp(26px,4vw,42px)] font-bold leading-[1.05] tracking-[-0.02em]">
                {movie.title}
              </h1>
              {movie.tagline && (
                <p className="m-0 mt-2 max-w-[560px] text-[15px] italic text-white/75">{movie.tagline}</p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13.5px] font-semibold text-white/85">
                {movie.rating > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 backdrop-blur-sm">
                    <span className="text-amber">★</span> {movie.rating.toFixed(1)}
                    <span className="font-normal text-white/60">
                      ({movie.voteCount.toLocaleString()})
                    </span>
                  </span>
                )}
                {meta.map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>

              {movie.genres.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {movie.genres.map((g) => (
                    <span
                      key={g}
                      className="rounded-full bg-white/12 px-3 py-1 text-[12.5px] font-semibold text-white/90 backdrop-blur-sm"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {movie.directors.length > 0 && (
                <div className="mt-4 text-[14px] text-white/80">
                  <span className="text-white/55">
                    {movie.directors.length > 1 ? "Directors" : "Director"} ·{" "}
                  </span>
                  {movie.directors.map((d, i) => (
                    <span key={d.id}>
                      {i > 0 && ", "}
                      <Link href={`/person/${d.id}`} className="font-semibold underline-offset-2 hover:underline">
                        {d.name}
                      </Link>
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex flex-wrap gap-2.5">
                {iWatched ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-white/15 px-4 py-2.5 text-[14px] font-bold text-white backdrop-blur-sm">
                      ✓ Watched
                    </span>
                    <button
                      onClick={() => moveToWatchlist(asPersonal())}
                      className="rounded-[10px] border border-white/25 px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-white/10"
                    >
                      Move to watchlist
                    </button>
                  </>
                ) : (
                  <>
                    {isMine ? (
                      <button
                        onClick={handleRemove}
                        className="group/rm inline-flex items-center rounded-[10px] bg-white px-4 py-2.5 text-[14px] font-bold text-black transition-colors"
                      >
                        <span className="group-hover/rm:hidden">✓ On your watchlist</span>
                        <span className="hidden group-hover/rm:inline">✕ Remove</span>
                      </button>
                    ) : (
                      <button
                        onClick={gate(() => add(asResult()))}
                        className="rounded-[10px] bg-white px-4 py-2.5 text-[14px] font-bold text-black transition-colors hover:bg-white/90"
                      >
                        + Add to watchlist
                      </button>
                    )}
                    <button
                      onClick={gate(() => markWatched(asPersonal()))}
                      className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/25 px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-white/10"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Mark watched
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body — positioned above the backdrop's bleed so text isn't overdrawn. */}
      <div className="relative z-[1] px-5 pb-4 pt-2 sm:px-8 lg:px-14">
        {movie.overview && (
          <section className="mb-10 max-w-[720px]">
            <h2 className="m-0 mb-2.5 font-display text-[19px] font-semibold tracking-[-0.01em]">Overview</h2>
            <p className="m-0 text-[15px] leading-[1.7] text-dim">{movie.overview}</p>
          </section>
        )}

        {movie.cast.length > 0 && (
          <section className="mb-10">
            <h2 className="m-0 mb-4 font-display text-[19px] font-semibold tracking-[-0.01em]">Top cast</h2>
            <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 p-0">
              {movie.cast.map((c) => (
                <li key={`${c.id}-${c.character}`}>
                  <CastTile {...c} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <a
          href={`https://www.themoviedb.org/movie/${movie.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent2 hover:underline"
        >
          View on TMDB
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7 17L17 7M17 7H8M17 7v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>
    </div>
  );
}
