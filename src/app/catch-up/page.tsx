"use client";

import { usePersonalPage } from "@/lib/usePersonalPage";
import AppShell from "@/components/AppShell";
import CatchUp from "@/components/CatchUp";
import Spinner from "@/components/Spinner";

export default function CatchUpPage() {
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
      <CatchUp user={user} personal={personal} />
    </AppShell>
  );
}
