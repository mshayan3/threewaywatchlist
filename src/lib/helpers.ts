// Small presentation helpers.

// Muted earth-tone avatar palette — all deep enough for white initials.
const PALETTE = ["#6e7e6f", "#8a6d52", "#5f6e86", "#856a66", "#7a7550", "#937b54"];

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
// Muted earth tones — sage, tan, slate-blue, mauve, olive, sand — each paired
// with a ~22%-darker shade (matching the design's diagonal poster fills).
const GRADIENTS = [
  "linear-gradient(150deg,#8a9a8b,#6b786c)",
  "linear-gradient(150deg,#b79a78,#8f785d)",
  "linear-gradient(150deg,#7c8aa0,#606b7c)",
  "linear-gradient(150deg,#a98a86,#836b68)",
  "linear-gradient(150deg,#9c9668,#7a7551)",
  "linear-gradient(150deg,#c0a17c,#957d61)",
  "linear-gradient(150deg,#8f8a76,#6f6b5c)",
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
