"use client";

import { useEffect, useRef, useState } from "react";
import { searchMovies } from "@/lib/tmdb";
import { parseYear, posterGradient } from "@/lib/helpers";
import type { TmdbResult } from "@/lib/types";

interface SearchBarProps {
  watchlistIds: Set<string>;
  watchedIds: Set<string>;
  onAdd: (result: TmdbResult) => void;
  placeholder?: string;
}

export default function SearchBar({
  watchlistIds,
  watchedIds,
  onAdd,
  placeholder = "Add a movie to your watchlist…",
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setResults([]);
        setError(null);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function clearSearch() {
    setResults([]);
    setError(null);
    setQuery("");
    if (timer.current) clearTimeout(timer.current);
  }

  function onChange(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    const q = value.trim();
    if (!q) {
      setResults([]);
      setError(null);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const r = await searchMovies(q);
        setResults(r);
        setError(null);
      } catch (err) {
        setResults([]);
        setError(err instanceof Error ? err.message : "Search failed");
      }
    }, 300);
  }

  return (
    <div className="relative mb-7" ref={wrapRef}>
      <svg
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        autoComplete="off"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[14px] border border-border bg-surface py-3.5 pl-[46px] pr-4 text-[15px] text-text outline-none transition-colors focus:border-accent"
      />

      {(results.length > 0 || error) && (
        <ul
          className="absolute left-0 right-0 z-[15] mt-2 rounded-[var(--radius-sm)] border border-border bg-surface p-1.5"
          style={{ boxShadow: "var(--card-shadow-hover)" }}
        >
          {error ? (
            <li className="p-3 text-[.9rem] text-accent2">Search failed — {error}</li>
          ) : (
            results.map((r) => {
              const hasPoster = !!r.poster_path;
              const year = parseYear(r.release_date);
              const id = String(r.id);
              const onWatchlist = watchlistIds.has(id);
              const onWatched = watchedIds.has(id);
              const already = onWatchlist || onWatched;
              const label = onWatchlist ? "On watchlist" : onWatched ? "On watched" : "Add";
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-[10px] p-2 transition-colors hover:bg-chip"
                >
                  {hasPoster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`https://image.tmdb.org/t/p/w92${r.poster_path}`}
                      alt=""
                      className="h-[60px] w-10 flex-none rounded-md object-cover"
                    />
                  ) : (
                    <span
                      className="h-[60px] w-10 flex-none rounded-md"
                      style={{ background: posterGradient(r.id) }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[.92rem] font-semibold">{r.title}</div>
                    <div className="text-[.82rem] text-dim">
                      {[year, r.genre].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <button
                    disabled={already}
                    onClick={() => {
                      onAdd(r);
                      clearSearch();
                    }}
                    className={
                      "flex-none rounded-lg px-3.5 py-2 text-[.84rem] font-bold transition-colors " +
                      (already
                        ? "cursor-default bg-chip text-faint"
                        : "bg-accent text-[var(--accent-text)] active:scale-95")
                    }
                  >
                    {label}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
