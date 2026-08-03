"use client";

import { useMemo } from "react";
import SearchBar from "./SearchBar";
import { usePersonalLists } from "@/lib/usePersonalLists";
import type { AppUser } from "@/lib/types";

// The desktop sidebar's search: a fully functional inline SearchBar (results
// dropdown + Add) rather than a link to the /search page. Owns its own personal
// lists instance so it works on any route; adds land straight on the watchlist
// and sync everywhere via realtime.
export default function SidebarSearch({ user }: { user: AppUser }) {
  const { watchlistIds, watchedIds, add } = usePersonalLists(user);
  const wl = useMemo(() => new Set([...watchlistIds].map(String)), [watchlistIds]);
  const wd = useMemo(() => new Set([...watchedIds].map(String)), [watchedIds]);

  return (
    <div className="mb-1.5">
      <SearchBar watchlistIds={wl} watchedIds={wd} onAdd={add} placeholder="Search films…" compact />
    </div>
  );
}
