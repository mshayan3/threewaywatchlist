"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import SearchBar from "./SearchBar";
import { usePersonalLists } from "@/lib/usePersonalLists";
import type { AppUser } from "@/lib/types";

// The desktop sidebar's search: a fully functional inline SearchBar (results
// dropdown + Add). Works for everyone — signed-out visitors can search and open
// detail pages; tapping Add sends them to sign in. Owns its own personal-lists
// instance (safe with a null user) so it works on any route.
export default function SidebarSearch({ user }: { user: AppUser | null }) {
  const router = useRouter();
  const { watchlistIds, watchedIds, add } = usePersonalLists(user);
  const wl = useMemo(() => new Set([...watchlistIds].map(String)), [watchlistIds]);
  const wd = useMemo(() => new Set([...watchedIds].map(String)), [watchedIds]);
  const onAdd = user ? add : () => router.push("/login");

  return (
    <div className="mb-1.5">
      <SearchBar watchlistIds={wl} watchedIds={wd} onAdd={onAdd} placeholder="Search films…" compact />
    </div>
  );
}
