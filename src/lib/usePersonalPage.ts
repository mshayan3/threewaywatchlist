"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuthUser } from "@/lib/useAuthUser";
import { usePersonalLists } from "@/lib/usePersonalLists";

// Shared boilerplate for the personal app routes (Home · Watchlist · Watched ·
// Search): resolve the signed-in user, own their watchlist/watched lists, guard
// the route client-side, and expose a sign-out. Middleware also protects these
// paths server-side; this handles a client-side sign-out mid-session.
export function usePersonalPage() {
  const router = useRouter();
  const { user, loading } = useAuthUser();
  const personal = usePersonalLists(user);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/");
  }, [router]);

  return { user, loading, personal, signOut };
}
