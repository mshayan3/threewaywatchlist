"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { fetchPersonDetail, prefetchMovieDetail } from "@/lib/tmdb";
import { initials, posterGradient } from "@/lib/helpers";
import Spinner from "@/components/Spinner";
import type { PersonCredit, PersonDetail } from "@/lib/types";

const img = (path: string | null, size: string) =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : "";

// Whole/most-recent age from a birthday (and optional death date).
function ageFrom(birthday: string, deathday: string | null): number | null {
  const born = new Date(birthday);
  if (Number.isNaN(born.getTime())) return null;
  const end = deathday ? new Date(deathday) : new Date();
  let age = end.getFullYear() - born.getFullYear();
  const m = end.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < born.getDate())) age--;
  return age >= 0 ? age : null;
}

function fmtDate(d: string): string {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

// A single film in the filmography — links through to the movie page.
function FilmTile({ id, title, year, poster, rating, role }: PersonCredit) {
  const src = img(poster, "w300");
  return (
    <Link href={`/movie/${id}`} onMouseEnter={() => prefetchMovieDetail(id)} className="group block">
      <div
        className="relative aspect-[2/3] overflow-hidden rounded-[12px] border border-line transition-colors group-hover:border-accent2"
        style={{
          boxShadow: "var(--card-shadow)",
          ...(src ? {} : { background: posterGradient(id) }),
        }}
      >
        {src ? (
          <Image src={src} alt={`Poster for ${title}`} fill sizes="(max-width: 640px) 45vw, 160px" className="object-cover" />
        ) : (
          <span className="absolute inset-x-0 bottom-0 p-3 font-display text-[16px] font-semibold leading-[1.1] text-white/95">
            {title}
          </span>
        )}
        {rating > 0 && (
          <div
            className="absolute right-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-bold text-[#f4eedf]"
            style={{ background: "var(--overlay)" }}
          >
            <span className="text-amber">★</span> {rating.toFixed(1)}
          </div>
        )}
      </div>
      <div className="px-0.5 pt-2">
        <div className="clamp-2 text-[14px] font-semibold leading-[1.2]">{title}</div>
        <div className="mt-0.5 text-[12.5px] text-faint">{[year, role].filter(Boolean).join(" · ")}</div>
      </div>
    </Link>
  );
}

function Filmography({ title, credits }: { title: string; credits: PersonCredit[] }) {
  if (credits.length === 0) return null;
  return (
    <section className="mb-10">
      <h2 className="m-0 mb-4 font-display text-[19px] font-semibold tracking-[-0.01em]">
        {title} <span className="text-faint">· {credits.length}</span>
      </h2>
      <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4 p-0">
        {credits.map((c) => (
          <li key={`${c.id}-${c.role}`}>
            <FilmTile {...c} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function PersonDetailView({ id }: { id: string }) {
  const router = useRouter();
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bioOpen, setBioOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    setPerson(null);
    setError(null);
    setBioOpen(false);
    fetchPersonDetail(id)
      .then((d) => alive && setPerson(d))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Failed to load"));
    return () => {
      alive = false;
    };
  }, [id]);

  if (error) {
    return (
      <div className="view-anim mx-auto max-w-[560px] py-20 text-center">
        <p className="m-0 text-[15px] text-faint">Couldn&apos;t load this person — {error}</p>
        <button
          onClick={() => router.back()}
          className="mt-5 rounded-[10px] border border-border px-4 py-2 text-[14px] font-semibold transition-colors hover:border-accent2"
        >
          ← Go back
        </button>
      </div>
    );
  }

  if (!person) return <Spinner />;

  const photo = img(person.profile, "w342");
  const age = person.birthday ? ageFrom(person.birthday, person.deathday) : null;

  // Facts line under the name.
  const facts: string[] = [];
  if (person.knownFor) facts.push(person.knownFor);
  if (person.birthday) {
    facts.push(
      person.deathday
        ? `${fmtDate(person.birthday)} – ${fmtDate(person.deathday)}${age != null ? ` (aged ${age})` : ""}`
        : `Born ${fmtDate(person.birthday)}${age != null ? ` · ${age} yrs` : ""}`
    );
  }
  if (person.placeOfBirth) facts.push(person.placeOfBirth);

  const bioLong = person.biography.length > 600;
  const bioText = bioLong && !bioOpen ? person.biography.slice(0, 600).trimEnd() + "…" : person.biography;

  // Lead with whichever department they're known for.
  const directorFirst = person.knownFor === "Directing";
  const director = (
    <Filmography key="dir" title="As Director" credits={person.directingCredits} />
  );
  const actor = <Filmography key="act" title="As Actor" credits={person.actingCredits} />;

  return (
    <div className="view-anim">
      <button
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-[13px] font-semibold transition-colors hover:border-accent2"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      {/* Header: photo + bio */}
      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:gap-8">
        <div
          className="w-[150px] flex-none overflow-hidden rounded-[16px] border border-line sm:w-[220px]"
          style={{ boxShadow: "var(--card-shadow)" }}
        >
          <div className="relative aspect-[2/3]">
            {photo ? (
              <Image
                src={photo}
                alt={person.name}
                fill
                priority
                sizes="(max-width: 640px) 150px, 220px"
                className="object-cover"
              />
            ) : (
              <span
                className="grid h-full w-full place-items-center text-[40px] font-extrabold text-white/90"
                style={{ background: posterGradient(person.id) }}
              >
                {initials(person.name)}
              </span>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="m-0 font-display text-[clamp(26px,4vw,40px)] font-bold leading-[1.05] tracking-[-0.02em]">
            {person.name}
          </h1>
          {facts.length > 0 && (
            <p className="m-0 mt-2 text-[14px] text-faint">{facts.join(" · ")}</p>
          )}

          {person.biography ? (
            <div className="mt-4 max-w-[680px]">
              <p className="m-0 whitespace-pre-line text-[15px] leading-[1.7] text-dim">{bioText}</p>
              {bioLong && (
                <button
                  onClick={() => setBioOpen((v) => !v)}
                  className="mt-2 text-[13.5px] font-semibold text-accent2 hover:underline"
                >
                  {bioOpen ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          ) : (
            <p className="mt-4 text-[14px] text-faint">No biography available.</p>
          )}

          <a
            href={`https://www.themoviedb.org/person/${person.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent2 hover:underline"
          >
            View on TMDB
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 17L17 7M17 7H8M17 7v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>

      {person.directingCredits.length === 0 && person.actingCredits.length === 0 ? (
        <p className="text-[14px] text-faint">No film credits found.</p>
      ) : directorFirst ? (
        [director, actor]
      ) : (
        [actor, director]
      )}
    </div>
  );
}
