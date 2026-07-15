"use client";

// A small count pill shown next to section headings.
export function Count({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-chip px-2.5 py-0.5 text-[.8rem] font-bold text-dim">
      {children}
    </span>
  );
}

// Responsive card grid used by the dashboard and group views.
export function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-[18px] p-0 sm:grid-cols-[repeat(auto-fill,minmax(172px,1fr))]">
      {children}
    </ul>
  );
}
