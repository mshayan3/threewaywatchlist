"use client";

import { usePersonalPage } from "@/lib/usePersonalPage";
import AppShell from "@/components/AppShell";
import Home from "@/components/Home";
import Spinner from "@/components/Spinner";

export default function HomePage() {
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
      <Home user={user} personal={personal} />
    </AppShell>
  );
}
