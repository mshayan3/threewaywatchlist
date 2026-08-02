"use client";

import { AppSidebar, MobileHeader, MobileTabBar } from "./AppNav";
import type { AppUser } from "@/lib/types";

// The signed-in app shell: a warm-paper "frame" floating on the page background.
// Desktop (≥lg) renders the canonical left sidebar beside the page content;
// below lg the same taxonomy lives in a top header + a fixed bottom tab bar.
// `title` overrides the mobile header heading (e.g. a group's name).
export default function AppShell({
  user,
  onSignOut,
  title,
  children,
}: {
  user: AppUser | null;
  onSignOut: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full px-0 py-0 sm:px-6 sm:py-8 lg:px-8 lg:py-8">
      <div
        className="mx-auto flex w-full max-w-[1440px] flex-col overflow-hidden border-y border-border bg-frame sm:rounded-[20px] sm:border lg:min-h-[calc(100vh-64px)] lg:flex-row"
        style={{ boxShadow: "var(--card-shadow-hover)" }}
      >
        <AppSidebar user={user} onSignOut={onSignOut} />
        <MobileHeader user={user} title={title} />
        <main className="min-w-0 flex-1 px-5 pb-28 pt-6 sm:px-8 sm:pt-8 lg:px-12 lg:pb-16 lg:pt-10">
          {children}
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}
