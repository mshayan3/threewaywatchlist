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
    <Link href="/dashboard" className="flex min-w-0 flex-none items-baseline gap-2.5">
      <span className="font-display text-[22px] font-bold tracking-[-0.02em]">
        Threeway
      </span>
      <span className="hidden text-[11px] font-semibold uppercase tracking-[0.22em] text-muted2 sm:inline">
        watchlist
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
    "rounded-full px-4 py-2 text-[13.5px] font-semibold transition-colors sm:px-6 " +
    (active
      ? "bg-surface2 text-text shadow-[0_1px_2px_rgba(50,40,20,.12)]"
      : "bg-transparent text-faint hover:text-text");

  return (
    <header className="border-b border-line bg-bar">
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 sm:gap-4 sm:px-10 sm:py-[18px]">
        <Logo />

        {user && (
          <nav className="flex flex-none gap-0.5 rounded-full bg-chip p-1">
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
                  "grid h-[38px] w-[38px] flex-none place-items-center overflow-hidden rounded-full text-[13px] font-bold text-[#3b2e1e] transition-all hover:opacity-90 active:scale-95 " +
                  (onProfile
                    ? "ring-2 ring-accent2 ring-offset-2 ring-offset-[var(--bar)]"
                    : "")
                }
                style={{ background: "#b79a78" }}
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
                className="grid h-[38px] w-[38px] flex-none place-items-center rounded-full border border-border text-faint transition-colors hover:text-text active:scale-95"
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
