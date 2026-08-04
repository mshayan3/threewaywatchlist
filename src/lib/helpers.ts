// Small presentation helpers.

// Cool slate/steel avatar palette — all deep enough for white initials.
const PALETTE = ["#3f4a5a", "#4a5568", "#3f5670", "#50566a", "#455a6e", "#3d5a5a"];

export function initials(name: string | null | undefined): string {
  const p = (name || "?").trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
}

export function colorFor(str: string | null | undefined): string {
  let h = 0;
  for (const c of str || "") h = c.charCodeAt(0) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
}

// Placeholder poster as an inline SVG data URI.
export function noPoster(w: number, h: number): string {
  const bg = "#22262e";
  const fg = "#8a909c";
  return (
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>` +
        `<rect width='100%' height='100%' fill='${bg}'/>` +
        `<text x='50%' y='50%' fill='${fg}' font-family='sans-serif' font-size='13' ` +
        `text-anchor='middle' dominant-baseline='middle'>No poster</text></svg>`
    )
  );
}

// Deterministic gradient for a movie poster fallback (keyed on title/id).
// Cool slate/steel/teal tones — each paired with a ~22%-darker shade, matching
// the wireframe's gray diagonal poster fills.
const GRADIENTS = [
  "linear-gradient(150deg,#3f4a5a,#2c333f)",
  "linear-gradient(150deg,#44506a,#2f3846)",
  "linear-gradient(150deg,#3a5670,#28323e)",
  "linear-gradient(150deg,#50566a,#33384a)",
  "linear-gradient(150deg,#455a6e,#2c3a46)",
  "linear-gradient(150deg,#3d5a5a,#2a3a3a)",
  "linear-gradient(150deg,#4a4f5e,#30343f)",
];
export function posterGradient(seed: string | number): string {
  const s = String(seed);
  let h = 0;
  for (const c of s) h = c.charCodeAt(0) + ((h << 5) - h);
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

// Turn a group name into a stable, URL-safe code. Unicode letters/numbers are
// preserved (so non-Latin names aren't silently emptied); only punctuation and
// whitespace collapse to dashes.
export function normalizeCode(s: string): string {
  return (s || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}-]/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Build the shareable invite URL for a group's token, e.g.
// https://host/join/<token>. Falls back to a relative path during SSR (no
// window), which the client re-resolves once mounted.
export function inviteUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/join/${token}`;
}

// Extract a 4-digit year from a TMDB release_date without assuming the string
// is always a well-formed YYYY-MM-DD. Returns "" when no leading year is found.
export function parseYear(releaseDate: string | null | undefined): string {
  const m = /^(\d{4})/.exec((releaseDate || "").trim());
  return m ? m[1] : "";
}

// Split a stored genre string into its individual genres. Rows carry one or two
// genres joined by "," (or a legacy "·"); the list/filter UIs treat each
// separately. Returns [] for empty/blank genres.
export function splitGenres(genre: string | null | undefined): string[] {
  return (genre || "")
    .split(/[,·]/)
    .map((g) => g.trim())
    .filter(Boolean);
}

// Distinct genres present across a set of movies, ordered most-common first,
// then alphabetically. Used to build the filter chip rows.
export function genreFacets(movies: { genre: string | null }[]): string[] {
  const tally = new Map<string, number>();
  for (const m of movies) for (const g of splitGenres(m.genre)) tally.set(g, (tally.get(g) || 0) + 1);
  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([g]) => g);
}
