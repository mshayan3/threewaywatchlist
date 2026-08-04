"use client";

import { useParams } from "next/navigation";
import { usePublicPage } from "@/lib/usePublicPage";
import AppShell from "@/components/AppShell";
import PersonDetailView from "@/components/PersonDetailView";

// Person page — serves both the director and the actor role for one TMDB
// person (many people are both). Their filmography is split into "As Director"
// and "As Actor" sections. Public: reachable from a movie's director/cast links
// and the home Popular People row, no sign-in required.
export default function PersonPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id || "";
  const { user, signOut } = usePublicPage();

  return (
    <AppShell user={user} onSignOut={signOut}>
      <PersonDetailView id={id} />
    </AppShell>
  );
}
