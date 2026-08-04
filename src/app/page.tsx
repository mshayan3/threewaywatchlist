"use client";

import { usePublicPage } from "@/lib/usePublicPage";
import AppShell from "@/components/AppShell";
import DiscoverHome from "@/components/DiscoverHome";
import Spinner from "@/components/Spinner";

// Public home / landing: a discover surface open to everyone. Signed-out
// visitors can browse and search; the watchlist, watched, and group sections
// stay gated (middleware redirects them to /login). The signed-in app shell
// appears once a session resolves.
export default function HomePage() {
  const { user, loading, signOut } = usePublicPage();

  return (
    <AppShell user={user} onSignOut={signOut}>
      {loading ? <Spinner /> : <DiscoverHome user={user} />}
    </AppShell>
  );
}
