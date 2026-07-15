"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppUser } from "@/lib/types";
import { initials } from "@/lib/helpers";
import ThemeToggle from "./ThemeToggle";
import { useConfirm } from "./ConfirmDialog";

interface TopBarProps {
  user: AppUser | null;
  onSignOut: () => void;
}

function Logo() {
  return (
    <Link href="/dashboard" className="flex min-w-0 flex-none items-center gap-2.5">
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
      <span className="hidden font-display text-[18px] font-extrabold tracking-[-0.01em] sm:inline">
        Threeway Watchlist
      </span>
    </Link>
  );
}

export default function TopBar({ user, onSignOut }: TopBarProps) {
  const pathname = usePathname() || "";
  const onGroups = pathname.startsWith("/groups");
  const onIndividual = pathname.startsWith("/dashboard");
  const onProfile = pathname.startsWith("/profile");
  const confirmDialog = useConfirm();

  const handleSignOut = async () => {
    const ok = await confirmDialog({
      title: "Sign out?",
      message: "You'll need to sign back in to see your lists and groups.",
      confirmLabel: "Sign out",
      danger: true,
    });
    if (ok) onSignOut();
  };

  const seg = (active: boolean) =>
    "rounded-[10px] px-4 py-2 text-[13.5px] font-bold transition-colors sm:px-[18px] " +
    (active
      ? "bg-accent2 text-white"
      : "bg-transparent text-dim hover:text-text");

  return (
    <header
      className="sticky top-0 z-[20] border-b border-border backdrop-blur-md"
      style={{ background: "var(--glass)" }}
    >
      <div className="mx-auto flex max-w-[1140px] items-center justify-between gap-3 px-4 py-3.5 sm:gap-4 sm:px-8 sm:py-4">
        <Logo />

        {user && (
          <nav className="flex flex-none gap-1 rounded-[14px] border border-border bg-chip p-[5px]">
            <Link href="/dashboard" className={seg(onIndividual)}>
              Individual
            </Link>
            <Link href="/groups" className={seg(onGroups)}>
              Groups
            </Link>
          </nav>
        )}

        <div className="flex flex-none items-center gap-2 sm:gap-2.5">
          <ThemeToggle />
          {user && (
            <>
              <Link
                href="/profile"
                title="Your profile"
                aria-label="Your profile"
                className={
                  "grid h-[38px] w-[38px] flex-none place-items-center overflow-hidden rounded-xl bg-accent2 text-[13px] font-extrabold text-white transition-all hover:opacity-90 active:scale-95 " +
                  (onProfile
                    ? "ring-2 ring-accent ring-offset-2 ring-offset-[var(--surface)]"
                    : "")
                }
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(user.name)
                )}
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign out"
                aria-label="Sign out"
                className="grid h-[38px] w-[38px] flex-none place-items-center rounded-xl border border-border bg-chip text-dim transition-colors hover:text-text active:scale-95"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
