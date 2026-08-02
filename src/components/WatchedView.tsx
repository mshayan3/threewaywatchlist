"use client";

import { useMemo, useState } from "react";
import PersonalMovieCard from "./PersonalMovieCard";
import { MovieGrid } from "./MovieRow";
import { posterGradient } from "@/lib/helpers";
import { useConfirm } from "./ConfirmDialog";
import type { PersonalMovie, Verdict } from "@/lib/types";

// Verdict → letter badge (good=G, ok=O, bad=B) with theme-aware colors.
const V: Record<Verdict, { letter: string; label: string; color: string; tint: string }> = {
  good: { letter: "G", label: "Good", color: "var(--good)", tint: "color-mix(in srgb, var(--good) 16%, transparent)" },
  ok: { letter: "O", label: "Okay", color: "var(--okay)", tint: "color-mix(in srgb, var(--okay) 16%, transparent)" },
  bad: { letter: "B", label: "Bad", color: "var(--bad)", tint: "color-mix(in srgb, var(--bad) 16%, transparent)" },
};
const ORDER: Verdict[] = ["good", "ok", "bad"];

type Filter = "all" | Verdict;
type ViewMode = "grid" | "list";

const byNewest = (a: PersonalMovie, b: PersonalMovie) =>
  new Date(b.at).getTime() - new Date(a.at).getTime();

function monthKey(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { key: "unknown", label: "Earlier" };
  return {
    key: `${d.getFullYear()}-${d.getMonth()}`,
    label: d.toLocaleString("en-US", { month: "long", year: "numeric" }),
  };
}

export default function WatchedView({
  watchedList,
  onSetVerdict,
  onRemove,
}: {
  watchedList: PersonalMovie[];
  onSetVerdict: (m: PersonalMovie, v: Verdict | null) => void;
  onRemove: (m: PersonalMovie) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<ViewMode>("grid");

  const counts = useMemo(() => {
    const c: Record<Verdict, number> = { good: 0, ok: 0, bad: 0 };
    for (const m of watchedList) if (m.verdict) c[m.verdict]++;
    return c;
  }, [watchedList]);

  const topGenre = useMemo(() => {
    const tally = new Map<string, number>();
    for (const m of watchedList) {
      const g = (m.genre || "").split(/[,·]/)[0].trim();
      if (g) tally.set(g, (tally.get(g) || 0) + 1);
    }
    let best = "";
    let n = 0;
    for (const [g, k] of tally) if (k > n) ((best = g), (n = k));
    return best;
  }, [watchedList]);

  const filtered = useMemo(
    () => watchedList.filter((m) => filter === "all" || m.verdict === filter).sort(byNewest),
    [watchedList, filter]
  );

  // Group the filtered list into ordered month sections.
  const sections = useMemo(() => {
    const map = new Map<string, { label: string; items: PersonalMovie[] }>();
    for (const m of filtered) {
      const { key, label } = monthKey(m.at);
      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key)!.items.push(m);
    }
    return [...map.values()];
  }, [filtered]);

  return (
    <div className="view-anim">
      <h1 className="m-0 mb-4 font-display text-[clamp(24px,3.4vw,32px)] font-semibold tracking-[-0.02em]">
        Watched
      </h1>

      {/* Stats block */}
      <div className="mb-4 flex w-max max-w-full flex-wrap overflow-hidden rounded-[10px] border border-border">
        <Stat text={`${watchedList.length} films`} />
        {topGenre && <Stat text={`Top genre · ${topGenre}`} divider />}
      </div>

      {watchedList.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          {/* G/O/B filter row */}
          <div className="flex flex-wrap gap-2">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
              All {watchedList.length}
            </FilterChip>
            {ORDER.map((v) => (
              <FilterChip
                key={v}
                active={filter === v}
                color={V[v].color}
                onClick={() => setFilter(filter === v ? "all" : v)}
              >
                {V[v].letter} {counts[v]}
              </FilterChip>
            ))}
          </div>
          {/* Grid / List toggle */}
          <div className="flex overflow-hidden rounded-[8px] border border-border">
            {(["grid", "list"] as ViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setView(m)}
                className={
                  "px-4 py-2 text-[13px] font-semibold capitalize transition-colors " +
                  (view === m ? "bg-surface2 text-text" : "text-faint hover:text-text")
                }
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      {sections.length === 0 ? (
        <p className="rounded-[16px] border border-dashed border-border px-4 py-14 text-center text-[14px] text-faint">
          {watchedList.length === 0
            ? "Nothing watched yet. Mark films as seen and they'll land here."
            : "No films match this filter."}
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {sections.map((s) => (
            <section key={s.label}>
              <h2 className="mb-3.5 font-display text-[15px] font-bold text-text">{s.label}</h2>
              {view === "grid" ? (
                <MovieGrid>
                  {s.items.map((m) => (
                    <PersonalMovieCard
                      key={m.tmdbId}
                      movie={m}
                      variant="watched"
                      onSetVerdict={onSetVerdict}
                      onRemove={onRemove}
                    />
                  ))}
                </MovieGrid>
              ) : (
                <ul className="flex list-none flex-col gap-2 p-0">
                  {s.items.map((m) => (
                    <WatchedRow key={m.tmdbId} movie={m} onSetVerdict={onSetVerdict} onRemove={onRemove} />
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ text, divider }: { text: string; divider?: boolean }) {
  return (
    <span
      className={
        "px-4 py-2 text-[13.5px] font-semibold text-dim " +
        (divider ? "border-l border-border" : "")
      }
    >
      {text}
    </span>
  );
}

function FilterChip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-9 items-center rounded-[8px] border px-3.5 text-[13px] font-semibold transition-colors"
      style={
        active
          ? { borderColor: color || "var(--text)", color: color || "var(--text)", background: "color-mix(in srgb, " + (color || "var(--text)") + " 12%, transparent)" }
          : { borderColor: "var(--border)", color: color || "var(--text-faint)" }
      }
    >
      {children}
    </button>
  );
}

// Compact list row for the "List" view: thumb · title/meta · verdict pills · remove.
function WatchedRow({
  movie,
  onSetVerdict,
  onRemove,
}: {
  movie: PersonalMovie;
  onSetVerdict: (m: PersonalMovie, v: Verdict | null) => void;
  onRemove: (m: PersonalMovie) => void;
}) {
  const confirmDialog = useConfirm();
  const hasPoster = !!movie.poster;
  const meta = [movie.year, movie.genre].filter(Boolean).join(" · ");

  const remove = async () => {
    const ok = await confirmDialog({
      title: `Remove "${movie.title}"?`,
      message: "This takes it off your watched list.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (ok) onRemove(movie);
  };

  return (
    <li className="flex items-center gap-3.5 rounded-[12px] border border-line bg-surface px-3 py-2.5">
      {hasPoster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://image.tmdb.org/t/p/w92${movie.poster}`}
          alt=""
          className="h-[54px] w-9 flex-none rounded-[5px] object-cover"
        />
      ) : (
        <span
          className="h-[54px] w-9 flex-none rounded-[5px]"
          style={{ background: posterGradient(movie.tmdbId) }}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-semibold text-text">{movie.title}</div>
        <div className="truncate text-[12.5px] text-faint">{meta}</div>
      </div>
      <div className="flex flex-none gap-1">
        {ORDER.map((v) => {
          const active = movie.verdict === v;
          return (
            <button
              key={v}
              title={V[v].label}
              aria-pressed={active}
              onClick={() => onSetVerdict(movie, active ? null : v)}
              className="grid h-8 w-8 place-items-center rounded-[7px] border text-[13px] font-bold transition-colors"
              style={
                active
                  ? { background: V[v].tint, color: V[v].color, borderColor: V[v].color }
                  : { color: "var(--muted2)", borderColor: "var(--border)" }
              }
            >
              {V[v].letter}
            </button>
          );
        })}
      </div>
      <button
        onClick={remove}
        aria-label={`Remove ${movie.title}`}
        className="grid h-8 w-8 flex-none place-items-center rounded-[7px] text-faint transition-colors hover:text-[var(--bad)]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
    </li>
  );
}
