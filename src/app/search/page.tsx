"use client";

import { usePersonalPage } from "@/lib/usePersonalPage";
import AppShell from "@/components/AppShell";
import SearchView from "@/components/SearchView";
import Spinner from "@/components/Spinner";

export default function SearchPage() {
  const { user, loading, personal, signOut } = usePersonalPage();

  if (loading || !user) {
    return (
      <AppShell user={null} onSignOut={signOut}>
        <Spinner />
      </AppShell>
    );
  }

  return (
    <AppShell user={user} onSignOut={signOut}>
      <SearchView personal={personal} />
    </AppShell>
  );
}
