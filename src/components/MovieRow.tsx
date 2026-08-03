"use client";

// A small count pill shown next to section headings.
export function Count({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-chip px-2.5 py-0.5 text-[.8rem] font-bold text-dim">
      {children}
    </span>
  );
}

// The primary movie grid: 3 columns on phones, 4 on tablets, 6 on desktop —
// wrapping into as many rows as needed. Denser than the old 4-col layout so
// posters read as compact cards rather than dominating the row.
export function MovieGrid({ children }: { children: React.ReactNode }) {
  return (
    <ul className="grid list-none grid-cols-3 gap-4 p-0 sm:grid-cols-4 sm:gap-5 lg:grid-cols-6">
      {children}
    </ul>
  );
}

// The groups grid: 1 → 2 → 3 columns, gap 22px (per the redesign's group cards).
export function GroupGrid({ children }: { children: React.ReactNode }) {
  return (
    <ul className="grid list-none grid-cols-1 gap-[22px] p-0 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </ul>
  );
}
