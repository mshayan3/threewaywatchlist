"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppUser } from "@/lib/types";
import { initials } from "@/lib/helpers";
import { useConfirm } from "./ConfirmDialog";
import ThemeToggle from "./ThemeToggle";
import SidebarSearch from "./SidebarSearch";
import {
  HomeIcon,
  SearchIcon,
  BookmarkIcon,
  CheckIcon,
  GroupsIcon,
  SparklesIcon,
} from "./NavIcons";

// One taxonomy, shared by the desktop sidebar and the mobile tab bar:
// Home · Search · Watchlist · Watched · Groups. Search is a first-class
// destination on mobile; on desktop it lives as the permanent field up top.
type NavItem = {
  href: string;
  label: string;
  Icon: (p: { className?: string }) => React.ReactElement;
  match: (path: string) => boolean;
};

const NAV: NavItem[] = [
  { href: "/home", label: "Home", Icon: HomeIcon, match: (p) => p === "/home" || p.startsWith("/dashboard") },
  { href: "/catch-up", label: "Catch up", Icon: SparklesIcon, match: (p) => p.startsWith("/catch-up") },
  { href: "/search", label: "Search", Icon: SearchIcon, match: (p) => p.startsWith("/search") },
  { href: "/watchlist", label: "Watchlist", Icon: BookmarkIcon, match: (p) => p.startsWith("/watchlist") },
  { href: "/watched", label: "Watched", Icon: CheckIcon, match: (p) => p.startsWith("/watched") },
  { href: "/groups", label: "Groups", Icon: GroupsIcon, match: (p) => p.startsWith("/groups") },
];

// A friendly page title for the mobile header, derived from the current route.
export function titleForPath(path: string): string {
  if (path.startsWith("/groups")) return "Groups";
  if (path.startsWith("/watchlist")) return "Watchlist";
  if (path.startsWith("/watched")) return "Watched";
  if (path.startsWith("/search")) return "Search";
  if (path.startsWith("/catch-up")) return "Catch up";
  if (path.startsWith("/profile")) return "Profile";
  return "Threeway Watchlist";
}

function useSignOut(onSignOut: () => void) {
  const confirmDialog = useConfirm();
  return async () => {
    const ok = await confirmDialog({
      title: "Sign out?",
      message: "You'll need to sign back in to see your lists and groups.",
      confirmLabel: "Sign out",
      danger: true,
    });
    if (ok) onSignOut();
  };
}

function Avatar({ user, size }: { user: AppUser; size: number }) {
  return (
    <span
      className="grid flex-none place-items-center overflow-hidden rounded-full font-bold text-[#c8ccd4]"
      style={{ width: size, height: size, background: "#3a4150", fontSize: size * 0.36 }}
    >
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(user.name)
      )}
    </span>
  );
}

/* ============================ Desktop sidebar ============================ */
// The canonical shell rail (≥lg). Brand → permanent search field → nav → the
// "me" block pinned to the bottom.
export function AppSidebar({
  user,
  onSignOut,
}: {
  user: AppUser | null;
  onSignOut: () => void;
}) {
  const path = usePathname() || "";
  const signOut = useSignOut(onSignOut);

  return (
    <aside className="hidden w-[288px] flex-none flex-col gap-1 border-r border-line bg-bar px-3 py-4 lg:flex lg:sticky lg:top-0 lg:h-screen lg:self-start">
      <Link
        href="/home"
        className="px-2 pb-3 pt-1 font-display text-[18px] font-bold tracking-[-0.02em]"
      >
        Threeway Watchlist
      </Link>

      {/* Permanent, fully-functional search field (inline results + Add). Falls
          back to a static link only during the signed-out/loading shell. */}
      {user ? (
        <SidebarSearch user={user} />
      ) : (
        <span className="mb-1.5 flex h-10 items-center gap-2.5 rounded-[10px] border border-border bg-input px-3 text-[14px] font-medium text-faint">
          <SearchIcon className="h-[18px] w-[18px]" />
          Search films…
        </span>
      )}

      <nav className="flex flex-col gap-0.5">
        {NAV.filter((n) => n.href !== "/search").map(({ href, label, Icon, match }) => {
          const on = match(path);
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? "page" : undefined}
              className={
                "flex h-10 items-center gap-3 rounded-[10px] px-3 text-[14px] font-semibold transition-colors " +
                (on
                  ? "bg-surface2 text-text shadow-[0_1px_2px_rgba(50,40,20,.12)]"
                  : "text-dim hover:bg-chip hover:text-text")
              }
            >
              <Icon className={"h-5 w-5 " + (on ? "text-text" : "text-faint")} />
              {label}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="mt-auto flex items-center gap-2.5 border-t border-line pt-3">
          <Link
            href="/profile"
            aria-label="Your profile"
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] px-1.5 py-1.5 transition-colors hover:bg-chip"
          >
            <Avatar user={user} size={36} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[14px] font-semibold text-text">{user.name}</span>
              <span className="truncate text-[12.5px] text-faint">Profile · Settings</span>
            </span>
          </Link>
          <ThemeToggle />
          <button
            type="button"
            onClick={signOut}
            title="Sign out"
            aria-label="Sign out"
            className="grid h-[38px] w-[38px] flex-none place-items-center rounded-full border border-border text-faint transition-colors hover:text-text active:scale-95"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </aside>
  );
}

/* ============================ Mobile header ============================ */
// Compact top bar shown below lg: current-page title + avatar/theme controls.
export function MobileHeader({
  user,
  title,
}: {
  user: AppUser | null;
  title?: string;
}) {
  const path = usePathname() || "";
  const heading = title ?? titleForPath(path);
  return (
    <header className="flex items-center justify-between gap-3 border-b border-line bg-bar px-5 py-3.5 lg:hidden">
      <span className="truncate font-display text-[18px] font-bold tracking-[-0.02em]">
        {heading}
      </span>
      <div className="flex flex-none items-center gap-2">
        <ThemeToggle />
        {user && (
          <Link href="/profile" aria-label="Your profile" className="active:scale-95">
            <Avatar user={user} size={34} />
          </Link>
        )}
      </div>
    </header>
  );
}

/* ============================ Mobile tab bar ============================ */
// Fixed bottom tabs (below lg) carrying the full taxonomy, with a home-indicator
// safe area. Rendered outside the framed card so it pins to the viewport.
export function MobileTabBar() {
  const path = usePathname() || "";
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-line bg-bar/95 px-1.5 pt-2 backdrop-blur lg:hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
    >
      {NAV.map(({ href, label, Icon, match }) => {
        const on = match(path);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={
              "flex w-[64px] flex-col items-center gap-1 py-1 text-[11px] font-semibold transition-colors " +
              (on ? "text-text" : "text-faint")
            }
          >
            <Icon className={"h-[22px] w-[22px] " + (on ? "text-text" : "text-faint")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
