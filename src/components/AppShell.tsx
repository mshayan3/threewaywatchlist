"use client";

import TopBar from "./TopBar";
import type { AppUser } from "@/lib/types";

// The signed-in app shell: a warm-paper "frame" floating on the page background,
// with the persistent top bar at its head and the page content inset below.
// Full-bleed on phones (no awkward margins), a centered ~1440px card on desktop.
export default function AppShell({
  user,
  onSignOut,
  children,
}: {
  user: AppUser | null;
  onSignOut: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full px-0 py-0 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div
        className="mx-auto w-full max-w-[1440px] overflow-hidden border-y border-border bg-frame sm:rounded-[20px] sm:border"
        style={{ boxShadow: "var(--card-shadow-hover)" }}
      >
        <TopBar user={user} onSignOut={onSignOut} />
        <div className="px-5 pb-14 pt-8 sm:px-10 sm:pb-16 sm:pt-12 lg:px-16 lg:pb-16 lg:pt-[52px]">
          {children}
        </div>
      </div>
    </div>
  );
}
