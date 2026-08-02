"use client";

import { usePersonalPage } from "@/lib/usePersonalPage";
import AppShell from "@/components/AppShell";
import WatchedView from "@/components/WatchedView";
import Spinner from "@/components/Spinner";

export default function WatchedPage() {
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
      <WatchedView
        watchedList={personal.watchedList}
        onSetVerdict={personal.setVerdict}
        onRemove={personal.removeFromWatched}
      />
    </AppShell>
  );
}
