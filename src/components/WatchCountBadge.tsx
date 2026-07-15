"use client";

// Small pill showing how many times the current user has watched a movie.
// Hidden entirely when count is 0 (never watched). Sits bottom-left of a poster
// so it clears the rating badge / remove button (top-right) and any avatars
// (top-left).
export default function WatchCountBadge({ count }: { count: number }) {
  if (!count || count <= 0) return null;
  return (
    <span
      className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-extrabold text-white backdrop-blur-sm"
      title={`You've watched this ${count} time${count > 1 ? "s" : ""}`}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {count}&#215;
    </span>
  );
}
