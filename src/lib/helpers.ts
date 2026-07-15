// Small presentation helpers.

// Fiery Ocean avatar palette — all dark enough for white initials.
const PALETTE = ["#c1121f", "#780000", "#003049", "#2f6d8c", "#8a1b23", "#0f5c7a"];

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
  const bg = "#f0e6d0";
  const fg = "#8a8a94";
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
const GRADIENTS = [
  "linear-gradient(150deg,#f2ad6d,#c04f7a)",
  "linear-gradient(150deg,#4c5da6,#0f1830)",
  "linear-gradient(150deg,#f0607f,#8f2748)",
  "linear-gradient(150deg,#83bd6f,#2f7a68)",
  "linear-gradient(150deg,#e23b3b,#1a1414)",
  "linear-gradient(150deg,#7c5cff,#241a52)",
  "linear-gradient(150deg,#ffb457,#b5471f)",
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

// Extract a 4-digit year from a TMDB release_date without assuming the string
// is always a well-formed YYYY-MM-DD. Returns "" when no leading year is found.
export function parseYear(releaseDate: string | null | undefined): string {
  const m = /^(\d{4})/.exec((releaseDate || "").trim());
  return m ? m[1] : "";
}
