"use client";

import { useParams } from "next/navigation";
import { usePublicPage } from "@/lib/usePublicPage";
import AppShell from "@/components/AppShell";
import MovieDetailView from "@/components/MovieDetailView";

// Movie description page: overview, director, top cast, and personal-list
// actions. Public — anyone can view; the add / mark-watched actions prompt
// sign-in for signed-out visitors.
export default function MoviePage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id || "";
  const { user, signOut } = usePublicPage();

  return (
    <AppShell user={user} onSignOut={signOut}>
      <MovieDetailView id={id} user={user} />
    </AppShell>
  );
}
