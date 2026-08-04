"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import SearchBar from "./SearchBar";
import { usePersonalLists } from "@/lib/usePersonalLists";
import type { AppUser } from "@/lib/types";

// The Search destination (its own tab on mobile; the permanent field on
// desktop links here). Public — anyone can search; Adds land on the watchlist
// when signed in, or send signed-out visitors to sign in.
export default function SearchView({ user }: { user: AppUser | null }) {
  const router = useRouter();
  const { watchlistIds, watchedIds, add } = usePersonalLists(user);
  const wl = useMemo(() => new Set([...watchlistIds].map(String)), [watchlistIds]);
  const wd = useMemo(() => new Set([...watchedIds].map(String)), [watchedIds]);
  const onAdd = user ? add : () => router.push("/login");

  return (
    <div className="view-anim">
      <h1 className="m-0 mb-1.5 font-display text-[clamp(24px,3.4vw,32px)] font-semibold tracking-[-0.02em]">
        Search
      </h1>
      <p className="m-0 mb-7 text-[15px] text-dim">
        {user
          ? "Find a film to add to your watchlist. Results already on your lists are marked."
          : "Find any film or person. Sign in to save films to a watchlist."}
      </p>

      <div className="max-w-[640px]">
        <SearchBar
          watchlistIds={wl}
          watchedIds={wd}
          onAdd={onAdd}
          placeholder="Search films & people…"
        />
      </div>

      <div className="mt-10 flex flex-col items-center gap-2 text-center text-faint">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6" />
          <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <p className="m-0 max-w-[300px] text-[14px]">
          Start typing a title above — tap Add to save it for later.
        </p>
      </div>
    </div>
  );
}
