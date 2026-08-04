"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import GroupMovieCard from "./GroupMovieCard";
import { MovieGrid } from "./MovieRow";
import { Tabs } from "./Dashboard";
import SortMenu from "./SortMenu";
import { FilterChip } from "./ListChrome";
import { useToast } from "./Toast";
import { colorFor, genreFacets, initials, inviteUrl, splitGenres } from "@/lib/helpers";
import type { Group, GroupMovie, Member } from "@/lib/types";

interface GroupViewProps {
  group: Group;
  movies: GroupMovie[];
  members: Member[];
  myUserId?: string;
  stale?: boolean;
  myWatchlistIds: Set<number>;
  myWatchedIds: Set<number>;
  myWatchCounts: Map<number, number>;
  // When embedded in the desktop master-detail pane the rail is always visible,
  // so the "‹ All groups" back link is hidden.
  embedded?: boolean;
  onBack: () => void;
  onRetry: () => void;
  onAddToMine: (m: GroupMovie) => void;
  onRemoveFromMine: (m: GroupMovie) => void;
  onRemoveMember: (m: Member) => void;
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
  myUserId,
  stale,
  myWatchlistIds,
  myWatchedIds,
  myWatchCounts,
  embedded,
  onBack,
  onRetry,
  onAddToMine,
  onRemoveFromMine,
  onRemoveMember,
  onLeave,
  onDelete,
}: GroupViewProps) {
  const [view, setView] = useState<View>("common");
  const [commonSort, setCommonSort] = useState<Sort>("demand");
  const [watchedSort, setWatchedSort] = useState<Sort>("title");
  const [genre, setGenre] = useState<string>("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [pick, setPick] = useState<GroupMovie | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Share the group by copying its invite link to the clipboard. Anyone with
  // the link can join (see the join_by_token RPC + /join/[token] route).
  const copyInvite = async () => {
    if (!group.inviteToken) return;
    try {
      await navigator.clipboard.writeText(inviteUrl(group.inviteToken));
      toast("Invite link copied");
    } catch {
      toast("Couldn't copy — try again from the Groups page.");
    }
  };

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
  const activeAll = view === "common" ? common : watched;

  // Genre filter facets for the active tab, most-common first. Applied after the
  // tab split so chips only offer genres actually present on this tab.
  const genres = useMemo(() => genreFacets(activeAll), [activeAll]);
  const activeGenre = genre !== "all" && genres.includes(genre) ? genre : "all";
  const active = useMemo(
    () =>
      activeGenre === "all"
        ? activeAll
        : activeAll.filter((m) => splitGenres(m.genre).includes(activeGenre)),
    [activeAll, activeGenre]
  );

  // Films every current member wants (and nobody's seen) — the group's strongest
  // "watch together" signal. byDemand already floats these to the top.
  const everyoneWants = useMemo(
    () => members.length > 0 && common.some((m) => m.queuedBy.length >= members.length),
    [common, members.length]
  );

  // The decision mechanic: draw a random film from the common list for tonight.
  const pickTonight = () => {
    if (common.length === 0) return;
    setView("common");
    setPick(common[Math.floor(Math.random() * common.length)]);
  };

  // Current user first, like the design's "You, Theo, Ravi & Jess".
  const ordered = useMemo(() => {
    if (!myUserId) return members;
    return [
      ...members.filter((m) => m.user_id === myUserId),
      ...members.filter((m) => m.user_id !== myUserId),
    ];
  }, [members, myUserId]);

  return (
    <div className="view-anim">
      {!embedded && (
        <button
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-faint transition-colors hover:text-text"
        >
          ‹ All groups
        </button>
      )}

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
              className="grid h-[30px] w-[30px] place-items-center rounded-[8px] border border-border text-faint transition-colors hover:text-text"
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
                {group.inviteToken && (
                  <MenuItem onClick={() => { setMenuOpen(false); copyInvite(); }}>
                    Copy invite link
                  </MenuItem>
                )}
                <MenuItem onClick={() => { setMenuOpen(false); setMembersOpen((o) => !o); }}>
                  {membersOpen ? "Hide members" : "Members"}
                </MenuItem>
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
            {ordered.slice(0, 5).map((m) => {
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
          {ordered.length > 0 && (
            <span className="text-[13.5px] font-medium text-faint">
              {memberSummary(ordered, myUserId)}
            </span>
          )}
          <button
            onClick={pickTonight}
            disabled={common.length === 0}
            className="flex-none rounded-[10px] bg-accent px-4 py-2.5 text-[13.5px] font-bold text-accent-text transition-transform active:scale-95 disabled:opacity-45"
          >
            Pick tonight →
          </button>
        </div>
      </div>

      {membersOpen && (
        <div className="mb-6 mt-4 rounded-[var(--radius)] border border-border bg-surface2 p-2">
          {ordered.map((m) => {
            const label = m.name || m.user_name || "…";
            const isMe = m.user_id === myUserId;
            return (
              <div
                key={m.user_id}
                className="flex items-center gap-3 rounded-[10px] px-3 py-2 transition-colors hover:bg-chip"
              >
                <span
                  className="grid h-[30px] w-[30px] flex-none place-items-center overflow-hidden rounded-full text-[11px] font-bold text-white"
                  style={m.avatar_url ? undefined : { background: colorFor(label) }}
                >
                  {m.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(label)
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-text">
                  {label}
                  {isMe && <span className="ml-1.5 text-[12px] font-medium text-faint">(you)</span>}
                </span>
                {group.isOwner && !isMe && (
                  <button
                    onClick={() => onRemoveMember(m)}
                    className="flex-none rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-semibold text-faint transition-colors hover:border-accent2 hover:text-text"
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mb-8 mt-4 max-w-[560px] text-[15px] leading-[1.55] text-dim">
        Pulled from everyone&apos;s watchlists, minus anything a member&apos;s already seen.
        Whatever&apos;s left is fair game for movie night.
      </p>

      {stale && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-accent2/40 bg-accent2/10 px-4 py-3 text-[.88rem] text-text">
          <span>Couldn&apos;t refresh — showing the last data we loaded.</span>
          <button
            onClick={onRetry}
            className="flex-none rounded-lg bg-accent2 px-3 py-1.5 text-[.82rem] font-bold text-white transition-opacity hover:opacity-90"
          >
            Retry
          </button>
        </div>
      )}

      {pick && (
        <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] border border-accent2 bg-accent2/10 px-5 py-4">
          <span className="text-[11.5px] font-bold uppercase tracking-[0.09em] text-accent2">
            Tonight&apos;s pick
          </span>
          <span className="font-display text-[18px] font-semibold text-text">{pick.title}</span>
          {pick.year && <span className="text-[13px] text-dim">{pick.year}</span>}
          <div className="ml-auto flex gap-2">
            <button
              onClick={pickTonight}
              className="rounded-[9px] border border-border px-3.5 py-2 text-[13px] font-semibold text-text transition-colors hover:border-accent2"
            >
              Re-roll
            </button>
            <button
              onClick={() => setPick(null)}
              className="rounded-[9px] px-3 py-2 text-[13px] font-semibold text-faint transition-colors hover:text-text"
            >
              Dismiss
            </button>
          </div>
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

      {genres.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <FilterChip active={activeGenre === "all"} onClick={() => setGenre("all")}>
            All {activeAll.length}
          </FilterChip>
          {genres.slice(0, 8).map((g) => (
            <FilterChip
              key={g}
              active={activeGenre === g}
              onClick={() => setGenre(activeGenre === g ? "all" : g)}
            >
              {g}
            </FilterChip>
          ))}
        </div>
      )}

      {view === "common" && everyoneWants && (
        <div
          className="mb-5 flex items-center gap-2.5 rounded-[10px] border px-4 py-2.5 text-[13px] font-bold"
          style={{
            borderColor: "var(--good)",
            background: "color-mix(in srgb, var(--good) 12%, transparent)",
            color: "var(--good)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Everyone wants these — sorted to top
        </div>
      )}

      {active.length > 0 ? (
        <MovieGrid>
          {active.map((m) => (
            <GroupMovieCard
              key={m.tmdbId}
              movie={m}
              variant={view}
              isMine={myWatchlistIds.has(m.tmdbId)}
              iWatched={myWatchedIds.has(m.tmdbId)}
              watchCount={myWatchCounts.get(m.tmdbId) ?? 0}
              myUserId={myUserId}
              onAddToMine={onAddToMine}
              onRemoveFromMine={onRemoveFromMine}
            />
          ))}
        </MovieGrid>
      ) : (
        <p className="rounded-[var(--radius)] border border-dashed border-border px-4 py-10 text-center text-[.95rem] text-faint">
          {activeGenre !== "all"
            ? `No ${activeGenre} films on this tab.`
            : view === "common"
              ? "Nothing to watch together yet — members can add movies from their dashboards."
              : "No movies have been watched by anyone in the group yet."}
        </p>
      )}
    </div>
  );
}

// "You", "You & Ravi", "You, Ravi & Jess", "You, Ravi, Jess +2"
function memberSummary(members: Member[], myUserId?: string): string {
  const names = members.map((m) =>
    m.user_id === myUserId ? "You" : (m.name || m.user_name || "…").split(/\s+/)[0]
  );
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
        (danger ? "text-text hover:bg-accent2/10" : "text-text hover:bg-chip")
      }
    >
      {children}
    </button>
  );
}
