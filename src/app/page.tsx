import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

// Muted earth-tone "posters" for the hero preview card.
const HERO = [
  { title: "Past Lives", from: "#8a9a8b", to: "#6b786c" },
  { title: "Perfect Days", from: "#b79a78", to: "#8f785d" },
  { title: "Drive", from: "#9c9668", to: "#7a7551" },
];

// Public landing page. Auth-gated routes live under /dashboard and /groups.
export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* header */}
      <header className="border-b border-line bg-bar">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display text-[22px] font-bold tracking-[-0.02em]">Threeway</span>
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.22em] text-muted2 sm:inline">
              watchlist
            </span>
          </div>
          <div className="flex items-center gap-3.5">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-full bg-accent px-5 py-2.5 text-[14px] font-semibold text-[var(--accent-text)] transition-transform active:scale-95"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* hero */}
      <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
        <div className="view-anim grid items-center gap-10 py-14 sm:py-24 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
          <div>
            <div className="mb-6 inline-block rounded-full border border-border px-[15px] py-[7px] text-[12.5px] font-semibold text-faint">
              No more &ldquo;wait — have you seen it?&rdquo;
            </div>
            <h1 className="m-0 mb-6 font-display text-[clamp(38px,5.4vw,60px)] font-semibold leading-[1.02] tracking-[-0.025em]">
              Everybody&apos;s watchlist, minus what you&apos;ve already seen.
            </h1>
            <p className="m-0 mb-10 max-w-[445px] text-[18px] leading-[1.6] text-dim">
              Keep your own list of movies to watch. Pool it with your friends and Threeway
              quietly hides anything someone&apos;s already seen — so you&apos;re left with stuff
              you can actually watch together.
            </p>
            <div className="flex flex-wrap items-center gap-3.5">
              <Link
                href="/login"
                className="rounded-[12px] bg-accent px-[30px] py-[15px] text-[15px] font-semibold text-[var(--accent-text)] transition-transform active:scale-[.98]"
              >
                Get started
              </Link>
              <Link
                href="/login"
                className="rounded-[12px] border border-border px-7 py-[15px] text-[15px] font-semibold text-text transition-colors hover:border-accent2"
              >
                I&apos;ve got an account
              </Link>
            </div>
          </div>

          {/* preview card */}
          <div className="relative rounded-[18px] border border-border bg-surface p-7">
            <div className="mb-5 flex items-center justify-between">
              <div className="text-[14px] font-bold">Roommates</div>
              <div className="text-[12.5px] font-semibold text-faint">7 movies everyone still needs</div>
            </div>
            <div className="grid grid-cols-3 gap-3.5">
              {HERO.map((m) => (
                <div
                  key={m.title}
                  className="flex aspect-[2/3] items-end rounded-[10px] p-3 font-display text-[15px] font-semibold leading-[1.12] text-white/95"
                  style={{ background: `linear-gradient(150deg, ${m.from}, ${m.to})` }}
                >
                  {m.title}
                </div>
              ))}
            </div>
            <div className="mt-[18px] flex items-center gap-2.5 rounded-[11px] bg-chip px-3.5 py-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: "var(--good)" }} aria-hidden="true">
                <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="text-[13px] text-dim">
                <b className="text-text">Aftersun</b> hidden — Theo&apos;s already seen it.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* footer bar */}
      <footer className="border-t border-line bg-bar">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-2 px-5 py-6 sm:px-8">
          <span className="text-[13px] text-faint">© 2026 Threeway Watchlist</span>
          <span className="text-[13px] text-faint">
            Movie data &amp; posters from{" "}
            <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">
              TMDB
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
