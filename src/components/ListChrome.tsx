"use client";

// Shared chrome for the personal list pages (Watchlist + Watched) so they read
// as one design: the stats strip, the grid/list view toggle, and the filter
// chips. Keeping these here means both pages stay pixel-identical.

export type ViewMode = "grid" | "list";

// The bordered stats strip under the page title — segments divided by hairlines.
export function StatBlock({ items }: { items: string[] }) {
  return (
    <div className="mb-4 flex w-max max-w-full flex-wrap overflow-hidden rounded-[10px] border border-border">
      {items.map((text, i) => (
        <span
          key={text}
          className={
            "px-4 py-2 text-[13.5px] font-semibold text-dim " +
            (i > 0 ? "border-l border-border" : "")
          }
        >
          {text}
        </span>
      ))}
    </div>
  );
}

// Segmented Grid / List switch — active segment is a light "ink" pill.
export function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-[8px] border border-border">
      {(["grid", "list"] as ViewMode[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          aria-pressed={view === m}
          className={
            "px-4 py-2 text-[13px] font-semibold capitalize transition-colors " +
            (view === m ? "bg-accent text-accent-text" : "text-faint hover:text-text")
          }
        >
          {m}
        </button>
      ))}
    </div>
  );
}

// Pill filter used for the verdict filters. Active "All" is a solid light pill;
// active colored chips keep their tinted, colored treatment.
export function FilterChip({
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
          ? color
            ? {
                background: "color-mix(in srgb, " + color + " 16%, transparent)",
                color,
                borderColor: color,
              }
            : { background: "var(--accent)", color: "var(--accent-text)", borderColor: "var(--accent)" }
          : { borderColor: "var(--border)", color: color || "var(--text-faint)" }
      }
    >
      {children}
    </button>
  );
}
