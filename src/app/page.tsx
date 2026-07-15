import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

// Public landing page. Auth-gated routes live under /dashboard and /groups.
export default function Landing() {
  return (
    <div className="min-h-screen">
      <header className="relative z-[5] mx-auto flex max-w-[1140px] items-center justify-between gap-5 px-5 py-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-[30px] w-[30px] place-items-center rounded-[9px]"
            style={{
              background: "conic-gradient(from 210deg, var(--accent), var(--accent2))",
              boxShadow: "0 6px 16px -4px var(--accent-glow)",
            }}
          >
            <span
              className="h-3.5 w-3.5 rounded-full"
              style={{ background: "linear-gradient(90deg,#fff 50%, rgba(255,255,255,.25) 50%)" }}
            />
          </span>
          <span className="font-display text-[18px] font-extrabold tracking-[-0.01em]">
            Threeway Watchlist
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <Link
            href="/login"
            className="rounded-full border border-border bg-chip px-[18px] py-2.5 text-[14px] font-bold text-text transition-colors hover:border-accent"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="view-anim relative z-[2] mx-auto max-w-[760px] px-6 pb-10 pt-[70px] text-center">
        <div className="mb-[26px] inline-flex items-center gap-2 rounded-full border border-border bg-chip px-[15px] py-[7px] text-[13px] font-semibold text-dim">
          <span className="h-[7px] w-[7px] rounded-full bg-accent2" />
          Built for movie nights with friends
        </div>

        <h1 className="m-0 mb-[22px] font-display text-[clamp(40px,6.2vw,66px)] font-extrabold leading-[1.03] tracking-[-0.025em]">
          Watch something
          <br />
          you <span className="text-accent2">all</span> still{" "}
          <span
            className="text-transparent"
            style={{
              background: "linear-gradient(120deg, var(--accent2), var(--amber))",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
            }}
          >
            need to see.
          </span>
        </h1>

        <p className="mx-auto mb-[34px] max-w-[520px] text-[18px] leading-[1.6] text-dim">
          Keep your own movie watchlist, then pool it with friends. Each group shows only
          the films <strong className="font-semibold text-text">nobody</strong> has watched
          yet — so picking movie night is effortless.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3.5">
          <Link
            href="/login"
            className="inline-flex items-center gap-2.5 rounded-full bg-accent px-7 py-[15px] text-[16px] font-extrabold text-[var(--accent-text)] transition-transform active:scale-[.98]"
            style={{ boxShadow: "0 14px 34px -10px var(--accent-glow)" }}
          >
            Get started <span className="text-[18px]">→</span>
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-border bg-chip px-6 py-[15px] text-[16px] font-bold text-text transition-colors hover:border-accent"
          >
            I have an account
          </Link>
        </div>

        <div className="mt-[34px] flex items-center justify-center gap-3">
          <div className="flex">
            <Avatar bg="#ef4444">MS</Avatar>
            <Avatar bg="#6366f1" overlap>BF</Avatar>
            <Avatar bg="#14b8a6" overlap>JD</Avatar>
          </div>
          <span className="text-[13px] text-faint">
            Muhammad + 2 friends already picking tonight
          </span>
        </div>
      </main>

      <footer className="relative z-[2] mt-11 px-6 text-center text-[12.5px] text-faint">
        Movie data from{" "}
        <a
          href="https://www.themoviedb.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent2 hover:underline"
        >
          TMDB
        </a>{" "}
        · not endorsed or certified by TMDB.
      </footer>
    </div>
  );
}

function Avatar({
  children,
  bg,
  overlap,
}: {
  children: React.ReactNode;
  bg: string;
  overlap?: boolean;
}) {
  return (
    <span
      className={
        "grid h-[30px] w-[30px] place-items-center rounded-full border-2 text-[10px] font-extrabold text-white " +
        (overlap ? "-ml-2.5" : "")
      }
      style={{ background: bg, borderColor: "var(--surface)" }}
    >
      {children}
    </span>
  );
}
