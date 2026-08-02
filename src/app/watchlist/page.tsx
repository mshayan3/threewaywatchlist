"use client";

import { usePersonalPage } from "@/lib/usePersonalPage";
import AppShell from "@/components/AppShell";
import WatchlistView from "@/components/WatchlistView";
import Spinner from "@/components/Spinner";

export default function WatchlistPage() {
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
      <WatchlistView
        watchlist={personal.watchlist}
        onMarkWatched={personal.markWatched}
        onRemove={personal.removeFromWatchlist}
      />
    </AppShell>
  );
}
