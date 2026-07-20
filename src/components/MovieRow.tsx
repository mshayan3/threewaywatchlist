"use client";

// A small count pill shown next to section headings.
export function Count({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-chip px-2.5 py-0.5 text-[.8rem] font-bold text-dim">
      {children}
    </span>
  );
}

// The primary movie grid: 2 columns on phones, 3 on tablets, 4 on desktop —
// wrapping into as many rows as needed (per the redesign's 4-col spec).
export function MovieGrid({ children }: { children: React.ReactNode }) {
  return (
    <ul className="grid list-none grid-cols-2 gap-5 p-0 sm:grid-cols-3 sm:gap-7 lg:grid-cols-4">
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
