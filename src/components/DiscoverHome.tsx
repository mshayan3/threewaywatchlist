"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import SearchBar from "./SearchBar";
import { usePersonalLists } from "@/lib/usePersonalLists";
import { fetchList, prefetchMovieDetail, prefetchPersonDetail } from "@/lib/tmdb";
import { initials, isUnreleased, posterGradient } from "@/lib/helpers";
import type { AppUser, DiscoverList, DiscoverMovie, DiscoverPerson } from "@/lib/types";

// Movie browse rows shown to everyone, in order. People get their own row type.
const MOVIE_ROWS: { key: string; title: string; hint: string }[] = [
  { key: "now_playing", title: "In theaters now", hint: "Playing this week" },
  { key: "trending", title: "Trending", hint: "What everyone's watching" },
  { key: "top_rated", title: "Top rated", hint: "Highest-scored of all time" },
  { key: "upcoming", title: "Coming soon", hint: "On the way to theaters" },
];
const ALL_KEYS = [...MOVIE_ROWS.map((r) => r.key), "popular_people"];

const posterUrl = (p: string | null, size = "w342") =>
  p ? `https://image.tmdb.org/t/p/${size}${p}` : "";

/* ------------------------------------------------------------------ cards */

function MoviePosterCard({ movie }: { movie: DiscoverMovie }) {
  const src = posterUrl(movie.poster);
  const unreleased = isUnreleased(movie.releaseDate);
  const meta = [movie.year, movie.genre].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/movie/${movie.id}`}
      onMouseEnter={() => prefetchMovieDetail(movie.id)}
      className="group block w-[150px] flex-none snap-start"
    >
      <div
        className="relative aspect-[2/3] overflow-hidden rounded-[12px] border border-line transition-colors group-hover:border-accent2"
        style={{ boxShadow: "var(--card-shadow)", ...(src ? {} : { background: posterGradient(movie.id) }) }}
      >
        {src ? (
          <Image
            src={src}
            alt={`Poster for ${movie.title}`}
            fill
            sizes="150px"
            className="object-cover"
          />
        ) : (
          <span className="absolute inset-x-0 bottom-0 p-3 font-display text-[15px] font-semibold leading-[1.1] text-white/95">
            {movie.title}
          </span>
        )}
        {movie.rating > 0 && (
          <div
            className="absolute right-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-bold text-[#f4eedf]"
            style={{ background: "var(--overlay)" }}
          >
            <span className="text-amber">★</span> {movie.rating.toFixed(1)}
          </div>
        )}
        {unreleased && (
          <div
            className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[#f4eedf]"
            style={{ background: "var(--overlay)" }}
          >
            Unreleased
          </div>
        )}
      </div>
      <div className="px-0.5 pt-2">
        <div className="clamp-2 text-[13.5px] font-semibold leading-[1.2]">{movie.title}</div>
        {meta && <div className="mt-0.5 text-[12px] text-faint">{meta}</div>}
      </div>
    </Link>
  );
}

function PersonCard({ person }: { person: DiscoverPerson }) {
  const src = posterUrl(person.profile, "w185");
  const sub = person.knownForTitles[0] || person.knownFor;
  return (
    <Link
      href={`/person/${person.id}`}
      onMouseEnter={() => prefetchPersonDetail(person.id)}
      className="group block w-[128px] flex-none snap-start text-center"
    >
      <div
        className="relative mx-auto aspect-square w-[112px] overflow-hidden rounded-full border border-line transition-colors group-hover:border-accent2"
        style={{ boxShadow: "var(--card-shadow)", ...(src ? {} : { background: posterGradient(person.id) }) }}
      >
        {src ? (
          <Image src={src} alt={person.name} fill sizes="112px" className="object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center text-[26px] font-extrabold text-white/90">
            {initials(person.name)}
          </span>
        )}
      </div>
      <div className="pt-2.5">
        <div className="clamp-2 text-[13.5px] font-semibold leading-[1.2]">{person.name}</div>
        {sub && <div className="mt-0.5 truncate text-[12px] text-faint">{sub}</div>}
      </div>
    </Link>
  );
}

function SkeletonRow({ circle }: { circle?: boolean }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={circle ? "w-[128px] flex-none" : "w-[150px] flex-none"}>
          <div
            className={
              "animate-pulse bg-surface2 " +
              (circle ? "mx-auto aspect-square w-[112px] rounded-full" : "aspect-[2/3] rounded-[12px]")
            }
          />
          <div className="mx-auto mt-2 h-3 w-3/4 animate-pulse rounded bg-surface2" />
        </div>
      ))}
    </div>
  );
}

function Row({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-9">
      <div className="mb-3.5 flex items-baseline gap-2.5">
        <h2 className="m-0 font-display text-[20px] font-bold tracking-[-0.01em]">{title}</h2>
        {hint && <span className="text-[13.5px] text-faint">{hint}</span>}
      </div>
      <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------- view */

export default function DiscoverHome({ user }: { user: AppUser | null }) {
  const router = useRouter();
  // Safe with a null user: the hook returns empty sets and no-op mutations.
  const { watchlistIds, watchedIds, add } = usePersonalLists(user);
  const wl = useMemo(() => new Set([...watchlistIds].map(String)), [watchlistIds]);
  const wd = useMemo(() => new Set([...watchedIds].map(String)), [watchedIds]);

  // Signed-out visitors can browse and search; adding prompts a sign-in.
  const onAdd = user ? add : () => router.push("/login");

  const [lists, setLists] = useState<Record<string, DiscoverList | "error">>({});

  useEffect(() => {
    let alive = true;
    ALL_KEYS.forEach((key) => {
      fetchList(key)
        .then((data) => alive && setLists((prev) => ({ ...prev, [key]: data })))
        .catch(() => alive && setLists((prev) => ({ ...prev, [key]: "error" })));
    });
    return () => {
      alive = false;
    };
  }, []);

  const firstName = user?.name.split(/\s+/)[0];
  const people = lists.popular_people;

  return (
    <div className="view-anim">
      {/* Hero + search */}
      <section className="mb-10 max-w-[680px]">
        <h1 className="m-0 mb-2 font-display text-[clamp(28px,4.4vw,40px)] font-semibold leading-[1.05] tracking-[-0.02em]">
          {user ? `Hey ${firstName} 👋` : "Find your next watch."}
        </h1>
        <p className="m-0 mb-6 text-[15.5px] leading-[1.55] text-dim">
          {user
            ? "Browse what's in theaters and trending, or search any film or person."
            : "Browse what's in theaters, trending, and top-rated — or search any film, director, or actor. Sign in to build a watchlist and share it with friends."}
        </p>
        <SearchBar
          watchlistIds={wl}
          watchedIds={wd}
          onAdd={onAdd}
          placeholder="Search films, directors, actors…"
        />
        {!user && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="rounded-[11px] bg-accent px-5 py-2.5 text-[14px] font-bold text-accent-text transition-transform active:scale-[.98]"
            >
              Create a free account
            </Link>
            <span className="text-[13.5px] text-faint">to save films and pool a watchlist with friends</span>
          </div>
        )}
      </section>

      {/* Movie rows */}
      {MOVIE_ROWS.map(({ key, title, hint }) => {
        const data = lists[key];
        if (data === "error") return null;
        return (
          <Row key={key} title={title} hint={hint}>
            {!data ? (
              <SkeletonRow />
            ) : data.kind === "movies" ? (
              data.results.map((m) => <MoviePosterCard key={m.id} movie={m} />)
            ) : null}
          </Row>
        );
      })}

      {/* Popular people */}
      {people !== "error" && (
        <Row title="Popular people" hint="Directors & actors in the spotlight">
          {!people ? (
            <SkeletonRow circle />
          ) : people.kind === "people" ? (
            people.results.map((p) => <PersonCard key={p.id} person={p} />)
          ) : null}
        </Row>
      )}
    </div>
  );
}
