"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import GroupMovieCard from "./GroupMovieCard";
import { CardGrid } from "./MovieRow";
import { Tabs, Footer } from "./Dashboard";
import SortMenu from "./SortMenu";
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
  onRemoveFromMine: (m: GroupMovie) => void;
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
// The Common tab can triage by demand; the Watched tab can't (nobody's queued),
// so it drops that option.
const COMMON_SORTS = [
  { value: "demand" as Sort, label: "Most wanted" },
  { value: "rating" as Sort, label: "Rating" },
  { value: "title" as Sort, label: "A–Z" },
];
const WATCHED_SORTS = [
  { value: "rating" as Sort, label: "Rating" },
  { value: "title" as Sort, label: "A–Z" },
];

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
  onRemoveFromMine,
  onLeave,
  onDelete,
}: GroupViewProps) {
  const [view, setView] = useState<View>("common");
  const [commonSort, setCommonSort] = useState<Sort>("demand");
  const [watchedSort, setWatchedSort] = useState<Sort>("title");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const common = useMemo(
    () => movies.filter(nobodyWatched).sort(SORTERS[commonSort]),
    [movies, commonSort]
  );
  const watched = useMemo(
    () => movies.filter((m) => !nobodyWatched(m)).sort(SORTERS[watchedSort]),
    [movies, watchedSort]
  );
  const active = view === "common" ? common : watched;

  return (
    <>
    <main className="view-anim relative z-[2] mx-auto max-w-[1000px] px-4 pt-4 sm:px-6">
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-faint transition-colors hover:text-text"
      >
        ‹ All groups
      </button>

      <div className="mb-1.5 flex flex-wrap items-start justify-between gap-5">
        <div className="flex min-w-0 items-center gap-4">
          <span
            className="grid h-[60px] w-[60px] flex-none place-items-center rounded-[16px] font-display text-[27px] font-bold text-white"
            style={{ background: colorFor(group.name || group.code) }}
          >
            {initials(group.name || group.code)}
          </span>
          <h1 className="m-0 font-display text-[clamp(24px,4vw,34px)] font-semibold tracking-[-0.02em] [overflow-wrap:anywhere]">
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

        <div className="flex items-center gap-3">
          <div className="flex">
            {members.slice(0, 5).map((m) => {
              const label = m.name || m.user_name;
              return (
                <span
                  key={m.user_id}
                  title={label || "…"}
                  className="-ml-2 grid h-[30px] w-[30px] flex-none place-items-center overflow-hidden rounded-full border-2 border-frame text-[11px] font-bold text-white first:ml-0"
                  style={m.avatar_url ? undefined : { background: colorFor(label) }}
                >
                  {m.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(label)
                  )}
                </span>
              );
            })}
          </div>
          {members.length > 0 && (
            <span className="text-[13.5px] font-medium text-faint">
              {memberSummary(members)}
            </span>
          )}
        </div>
      </div>

      <p className="mb-8 mt-4 max-w-[560px] text-[15px] leading-[1.55] text-dim">
        Pulled from everyone&apos;s watchlists, minus anything a member&apos;s already seen.
        Whatever&apos;s left is fair game for movie night.
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

      <div className="mb-8 flex flex-wrap items-end justify-between gap-3 border-b border-line">
        <Tabs
          value={view}
          onChange={setView}
          options={[
            { key: "common", label: "Common", count: common.length },
            { key: "watched", label: "Watched", count: watched.length },
          ]}
        />
        <div className="pb-3">
          {view === "common" ? (
            <SortMenu value={commonSort} onChange={setCommonSort} options={COMMON_SORTS} />
          ) : (
            <SortMenu value={watchedSort} onChange={setWatchedSort} options={WATCHED_SORTS} />
          )}
        </div>
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
              onRemoveFromMine={onRemoveFromMine}
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

    </main>
      <Footer />
    </>
  );
}

// "Ada", "Ada & Ravi", "Ada, Ravi & Jess", "Ada, Ravi, Jess +2"
function memberSummary(members: Member[]): string {
  const names = members.map((m) => (m.name || m.user_name || "…").split(/\s+/)[0]);
  if (names.length <= 1) return names[0] || "";
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]} & ${names[2]}`;
  return `${names[0]}, ${names[1]}, ${names[2]} +${names.length - 3}`;
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
