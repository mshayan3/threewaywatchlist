"use client";

// A small count pill shown next to section headings.
export function Count({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-chip px-2.5 py-0.5 text-[.8rem] font-bold text-dim">
      {children}
    </span>
  );
}

// Responsive card grid used by the group views.
export function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-[18px] p-0 sm:grid-cols-[repeat(auto-fill,minmax(172px,1fr))]">
      {children}
    </ul>
  );
}

// Horizontal scrolling gallery — shows 2 cards on small screens and exactly 4
// on wider ones, with scroll-snap for the rest. Used on the dashboard.
export function Gallery({ children }: { children: React.ReactNode }) {
  return (
    <ul
      className="flex list-none gap-5 overflow-x-auto p-0 pb-4 sm:gap-7 [scroll-snap-type:x_mandatory] [&>li]:w-[calc((100%-20px)/2)] [&>li]:flex-none [&>li]:snap-start sm:[&>li]:w-[calc((100%-84px)/4)]"
    >
      {children}
    </ul>
  );
}
