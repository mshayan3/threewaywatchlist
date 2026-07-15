"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import GroupMovieCard from "./GroupMovieCard";
import { Count, CardGrid } from "./MovieRow";
import { Segmented, Footer } from "./Dashboard";
import { colorFor, initials } from "@/lib/helpers";
import type { Group, GroupMovie, Member } from "@/lib/types";

interface GroupViewProps {
  group: Group;
  movies: GroupMovie[];
  members: Member[];
  stale?: boolean;
  myWatchlistIds: Set<number>;
  myWatchedIds: Set<number>;
  myWatchCounts: Map<number, number>;
  onBack: () => void;
  onRetry: () => void;
  onAddToMine: (m: GroupMovie) => void;
  onLeave: () => void;
  onDelete: () => void;
}

const byTitle = (a: GroupMovie, b: GroupMovie) => a.title.localeCompare(b.title);
// Triage: most-wanted first (more members queuing it), then alphabetical.
const byDemand = (a: GroupMovie, b: GroupMovie) =>
  b.queuedBy.length - a.queuedBy.length || a.title.localeCompare(b.title);
// Highest TMDB rating first, then alphabetical.
const byRating = (a: GroupMovie, b: GroupMovie) =>
  (b.rating || 0) - (a.rating || 0) || a.title.localeCompare(b.title);
const nobodyWatched = (m: GroupMovie) => m.watchedBy.length === 0;

type View = "common" | "watched";
type Sort = "demand" | "rating" | "title";
const SORTERS: Record<Sort, (a: GroupMovie, b: GroupMovie) => number> = {
  demand: byDemand,
  rating: byRating,
  title: byTitle,
};

export default function GroupView({
  group,
  movies,
  members,
  stale,
  myWatchlistIds,
  myWatchedIds,
  myWatchCounts,
  onBack,
  onRetry,
  onAddToMine,
  onLeave,
  onDelete,
}: GroupViewProps) {
  const [view, setView] = useState<View>("common");
  const [sort, setSort] = useState<Sort>("demand");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const cmp = SORTERS[sort];
  const common = useMemo(
    () => movies.filter(nobodyWatched).sort(cmp),
    [movies, cmp]
  );
  const watched = useMemo(
    () => movies.filter((m) => !nobodyWatched(m)).sort(cmp),
    [movies, cmp]
  );
  const active = view === "common" ? common : watched;

  return (
    <main className="view-anim relative z-[2] mx-auto max-w-[1000px] px-6 pt-4">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-dim transition-colors hover:text-text"
      >
        ‹ Groups
      </button>

      <div className="mb-1.5 flex flex-wrap items-start justify-between gap-5">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="m-0 font-display text-[clamp(24px,4vw,32px)] font-extrabold tracking-[-0.02em] [overflow-wrap:anywhere]">
            {group.name || group.code}
          </h1>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={menuOpen}
              title="Group menu"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((o) => !o);
              }}
              className="grid h-8 w-8 place-items-center rounded-full text-dim transition-colors hover:bg-chip hover:text-text"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />
              </svg>
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute left-0 top-[calc(100%+6px)] z-30 flex min-w-[180px] flex-col rounded-[var(--radius-sm)] border border-border bg-surface p-1.5"
                style={{ boxShadow: "var(--card-shadow-hover)" }}
              >
                <MenuItem onClick={() => { setMenuOpen(false); onLeave(); }}>Leave group</MenuItem>
                {group.isOwner && (
                  <MenuItem danger onClick={() => { setMenuOpen(false); onDelete(); }}>
                    Delete group
                  </MenuItem>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {members.map((m) => (
            <span
              key={m.user_id}
              className="flex items-center gap-2 rounded-full border border-border bg-surface py-1.5 pl-1.5 pr-3.5 text-[13px] font-semibold"
            >
              <span
                className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full text-[10px] font-extrabold text-white"
                style={{ background: colorFor(m.user_name) }}
              >
                {initials(m.user_name)}
              </span>
              {m.user_name || "…"}
            </span>
          ))}
        </div>
      </div>

      <p className="mb-6 mt-0 text-[15px] text-dim">
        Combined from everyone&apos;s watchlists — hiding anything a member has already seen.
      </p>

      {stale && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-accent2/40 bg-accent2/10 px-4 py-3 text-[.88rem] text-accent2">
          <span>Couldn&apos;t refresh — showing the last data we loaded.</span>
          <button
            onClick={onRetry}
            className="flex-none rounded-lg bg-accent2 px-3 py-1.5 text-[.82rem] font-bold text-white transition-opacity hover:opacity-90"
          >
            Retry
          </button>
        </div>
      )}

      <div className="mb-1 flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex items-center gap-2.5">
          <h2 className="m-0 font-display text-[21px] font-bold">
            {view === "common" ? "Common watchlist" : "Already watched"}
          </h2>
          <Count>{active.length}</Count>
        </div>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            ["common", "Common"],
            ["watched", "Watched"],
          ]}
        />
      </div>
      <p className="mb-3 mt-0 text-[13.5px] text-faint">
        {view === "common"
          ? "On someone's list, and nobody in the group has watched yet."
          : "Seen by someone in the group."}
      </p>

      <div className="mb-[18px] flex items-center gap-2.5">
        <span className="text-[12.5px] font-semibold text-dim">Sort</span>
        <Segmented
          value={sort}
          onChange={setSort}
          options={[
            ["demand", "Most wanted"],
            ["rating", "Rating"],
            ["title", "A\u2013Z"],
          ]}
        />
      </div>

      {active.length > 0 ? (
        <CardGrid>
          {active.map((m) => (
            <GroupMovieCard
              key={m.tmdbId}
              movie={m}
              variant={view}
              isMine={myWatchlistIds.has(m.tmdbId)}
              iWatched={myWatchedIds.has(m.tmdbId)}
              watchCount={myWatchCounts.get(m.tmdbId) ?? 0}
              onAddToMine={onAddToMine}
            />
          ))}
        </CardGrid>
      ) : (
        <p className="rounded-[var(--radius)] border border-dashed border-border px-4 py-10 text-center text-[.95rem] text-faint">
          {view === "common"
            ? "Nothing to watch together yet — members can add movies from their dashboards."
            : "No movies have been watched by anyone in the group yet."}
        </p>
      )}

      <Footer />
    </main>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={
        "rounded-lg px-3 py-2.5 text-left text-[.88rem] font-semibold transition-colors " +
        (danger ? "text-accent2 hover:bg-accent2/10" : "text-text hover:bg-chip")
      }
    >
      {children}
    </button>
  );
}
