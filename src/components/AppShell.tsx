"use client";

import { AppSidebar, MobileHeader, MobileTabBar } from "./AppNav";
import type { AppUser } from "@/lib/types";

// The signed-in app shell: fills the entire browser window. Desktop (≥lg)
// renders the canonical left sidebar (sticky, full-height) beside the page
// content; below lg the same taxonomy lives in a top header + a fixed bottom
// tab bar. `title` overrides the mobile header heading (e.g. a group's name).
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
    <div className="flex min-h-screen w-full flex-col bg-frame lg:flex-row">
      <AppSidebar user={user} onSignOut={onSignOut} />
      <MobileHeader user={user} title={title} />
      <main className="min-w-0 flex-1 px-5 pb-28 pt-6 sm:px-8 sm:pt-8 lg:px-14 lg:pb-16 lg:pt-10">
        {children}
      </main>
      <MobileTabBar />
    </div>
  );
}
