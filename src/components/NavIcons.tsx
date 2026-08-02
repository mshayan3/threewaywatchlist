// Shared line icons for the app's one-taxonomy navigation (sidebar + mobile
// tabs). Each is a 24×24 stroked glyph that inherits `currentColor`, matching
// the wireframe's Home · Search · Watchlist · Watched · Groups set.

type IconProps = { className?: string };

const base = (className?: string) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className,
});

export function HomeIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10.5V19h12v-8.5" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}

// Watchlist = bookmark (saved for later).
export function BookmarkIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M7 4h10v16l-5-4-5 4z" />
    </svg>
  );
}

// Watched = check (already seen).
export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M5 12l5 5 9-11" />
    </svg>
  );
}

export function GroupsIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <circle cx="8" cy="9" r="3" />
      <circle cx="16.5" cy="10" r="2.5" />
      <path d="M3 19c0-3 2.2-5 5-5s5 2 5 5" />
      <path d="M14 19c.3-2 1.3-3.3 3-3.3" />
    </svg>
  );
}
