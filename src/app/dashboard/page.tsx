"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuthUser } from "@/lib/useAuthUser";
import { usePersonalLists } from "@/lib/usePersonalLists";
import TopBar from "@/components/TopBar";
import Dashboard from "@/components/Dashboard";
import Spinner from "@/components/Spinner";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuthUser();
  const personal = usePersonalLists(user);

  // Middleware guards this route, but handle a client-side sign-out too.
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  if (loading || !user) {
    return (
      <>
        <TopBar user={null} onSignOut={signOut} />
        <Spinner />
      </>
    );
  }

  return (
    <>
      <TopBar user={user} onSignOut={signOut} />
      <Dashboard
        user={user}
        watchlist={personal.watchlist}
        watchedList={personal.watchedList}
        onAdd={personal.add}
        onAddToWatched={personal.addToWatched}
        onMarkWatched={personal.markWatched}
        onMoveToWatchlist={personal.moveToWatchlist}
        onRemoveFromWatchlist={personal.removeFromWatchlist}
        onRemoveFromWatched={personal.removeFromWatched}
      />
    </>
  );
}
