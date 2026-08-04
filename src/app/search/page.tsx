"use client";

import { usePublicPage } from "@/lib/usePublicPage";
import AppShell from "@/components/AppShell";
import SearchView from "@/components/SearchView";

// Public search page — the mobile Search tab and desktop deep-link. Anyone can
// search; SearchView gates the Add action to sign-in when signed out.
export default function SearchPage() {
  const { user, signOut } = usePublicPage();

  return (
    <AppShell user={user} onSignOut={signOut}>
      <SearchView user={user} />
    </AppShell>
  );
}
