"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuthUser } from "@/lib/useAuthUser";

// Boilerplate for the PUBLIC app routes (Home · Search · Movie · Person):
// resolve the signed-in user if there is one, but never redirect a signed-out
// visitor away — these pages are browsable by anyone. Personal actions gate to
// sign-in at the point of use. Mirrors usePersonalPage, minus the auth guard.
export function usePublicPage() {
  const router = useRouter();
  const { user, loading } = useAuthUser();

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/");
  }, [router]);

  return { user, loading, signOut };
}
