"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { fetchMovieDetail, prefetchPersonDetail } from "@/lib/tmdb";
import { initials, isUnreleased, posterGradient } from "@/lib/helpers";
import Spinner from "@/components/Spinner";
import { useConfirm } from "@/components/ConfirmDialog";
import { usePersonalLists } from "@/lib/usePersonalLists";
import type { AppUser, MovieDetail, PersonalMovie, TmdbResult, Verdict } from "@/lib/types";

// Personal good/ok/bad take — colors match PersonalMovieCard's verdict tokens.
const VERDICTS: { key: Verdict; label: string; color: string; tint: string }[] = [
  { key: "good", label: "Good", color: "#3fb950", tint: "rgba(63,185,80,.22)" },
  { key: "ok", label: "Okay", color: "#e0a92b", tint: "rgba(224,169,43,.22)" },
  { key: "bad", label: "Bad", color: "#e5534b", tint: "rgba(229,83,75,.22)" },
];

// Hero-styled verdict picker (white-on-backdrop) for a watched film. Shows the
// caller's current rating and lets them change or clear it.
function HeroVerdict({
  value,
  onChange,
}: {
  value: Verdict | null | undefined;
  onChange: (v: Verdict | null) => void;
}) {
  return (
    <div className="mt-5">
      <div className="mb-1.5 text-[12.5px] font-semibold uppercase tracking-wide text-white/55">
        Your rating
      </div>
      <div className="flex gap-2" role="group" aria-label="Your rating">
        {VERDICTS.map((v) => {
          const active = value === v.key;
          return (
            <button
              key={v.key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? null : v.key)}
              className="rounded-[9px] border px-4 py-2 text-[13.5px] font-bold backdrop-blur-sm transition-colors"
              style={
                active
                  ? { background: v.tint, color: "#fff", borderColor: v.color }
                  : { background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.85)", borderColor: "rgba(255,255,255,.25)" }
              }
            >
              {v.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Click-to-reveal wrapper hiding potential spoilers (overview / cast) until the
// visitor opts in. Collapsed state shows a blurred teaser behind a reveal button.
function SpoilerSection({
  heading,
  revealed,
  onReveal,
  className = "",
  children,
}: {
  heading: string;
  revealed: boolean;
  onReveal: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={"mb-10 " + className}>
      <div className="mb-2.5 flex items-center gap-3">
        <h2 className="m-0 font-display text-[19px] font-semibold tracking-[-0.01em]">{heading}</h2>
        {revealed && (
          <span className="text-[12px] text-faint">spoilers shown</span>
        )}
      </div>
      {revealed ? (
        children
      ) : (
        <button
          onClick={onReveal}
          className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-dashed border-border py-6 text-[14px] font-semibold text-dim transition-colors hover:border-accent2 hover:text-text"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          Show {heading.toLowerCase()} — may contain spoilers
        </button>
      )}
    </section>
  );
}

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

// Human-friendly release date (e.g. "March 14, 2026"); falls back to the raw
// string if TMDB hands us something unparseable.
function fmtReleaseDate(d: string): string {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

// A cast member tile — links through to that person's page.
function CastTile({ id, name, character, profilePath }: MovieDetail["cast"][number]) {
  const photo = img(profilePath, "w185");
  return (
    <Link
      href={`/person/${id}`}
      onMouseEnter={() => prefetchPersonDetail(id)}
      className="group/cast flex flex-col gap-2 rounded-[12px] border border-line bg-surface p-2 transition-colors hover:border-accent2"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-[9px]">
        {photo ? (
          <Image src={photo} alt={name} fill sizes="120px" className="object-cover" />
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
  // Spoilers stay hidden until the visitor opts in (reset per movie).
  const [showOverview, setShowOverview] = useState(false);
  const [showCast, setShowCast] = useState(false);

  // Safe with a null user: the hook returns empty sets and no-op mutations.
  const {
    watchedList,
    watchlistIds,
    watchedIds,
    add,
    markWatched,
    moveToWatchlist,
    removeFromWatchlist,
    setVerdict,
  } = usePersonalLists(user);

  // Signed-out visitors can view everything; list actions send them to sign in.
  const gate = (fn: () => void) => () => (user ? fn() : router.push("/login"));

  useEffect(() => {
    let alive = true;
    setMovie(null);
    setError(null);
    setShowOverview(false);
    setShowCast(false);
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
  const unreleased = isUnreleased(movie.releaseDate);
  // The caller's personal good/ok/bad take, if they've watched it.
  const myVerdict = watchedList.find((m) => m.tmdbId === numId)?.verdict ?? null;

  // Store up to the top two genres so cards read consistently with search-added
  // rows (the ?id= / search branches already emit two).
  const topGenres = movie.genres.slice(0, 2).join(", ");

  const asResult = (): TmdbResult => ({
    id: movie.id,
    title: movie.title,
    release_date: movie.releaseDate,
    poster_path: movie.poster,
    rating: movie.rating,
    genre: topGenres,
  });
  const asPersonal = (): PersonalMovie => ({
    tmdbId: movie.id,
    title: movie.title,
    year: movie.year,
    poster: movie.poster || "",
    rating: movie.rating,
    genre: topGenres,
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
            <Image
              src={backdrop}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
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
                  <Image
                    src={poster}
                    alt={`Poster for ${movie.title}`}
                    fill
                    priority
                    sizes="(max-width: 640px) 150px, 210px"
                    className="object-cover"
                  />
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
                {unreleased && (
                  <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                    Unreleased
                  </span>
                )}
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
                      <Link
                        href={`/person/${d.id}`}
                        onMouseEnter={() => prefetchPersonDetail(d.id)}
                        className="font-semibold underline-offset-2 hover:underline"
                      >
                        {d.name}
                      </Link>
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              {unreleased ? (
                <div className="mt-6">
                  <span className="inline-flex items-center gap-2 rounded-[10px] bg-black/35 px-4 py-2.5 text-[14px] font-bold text-white backdrop-blur-sm">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.9" />
                      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Not yet released
                  </span>
                  <p className="m-0 mt-2 text-[13px] text-white/65">
                    {movie.releaseDate
                      ? `Releases ${fmtReleaseDate(movie.releaseDate)}. `
                      : ""}
                    It can&apos;t be added to a watchlist until it&apos;s out.
                  </p>
                </div>
              ) : (
                <>
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

                  {/* The caller's personal rating — only once they've watched it. */}
                  {user && iWatched && (
                    <HeroVerdict
                      value={myVerdict}
                      onChange={(v) => setVerdict(asPersonal(), v)}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body — positioned above the backdrop's bleed so text isn't overdrawn. */}
      <div className="relative z-[1] px-5 pb-4 pt-2 sm:px-8 lg:px-14">
        {movie.overview && (
          <SpoilerSection heading="Overview" revealed={showOverview} onReveal={() => setShowOverview(true)} className="max-w-[720px]">
            <p className="m-0 text-[15px] leading-[1.7] text-dim">{movie.overview}</p>
          </SpoilerSection>
        )}

        {movie.cast.length > 0 && (
          <SpoilerSection heading="Top cast" revealed={showCast} onReveal={() => setShowCast(true)}>
            <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 p-0">
              {movie.cast.map((c) => (
                <li key={`${c.id}-${c.character}`}>
                  <CastTile {...c} />
                </li>
              ))}
            </ul>
          </SpoilerSection>
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
