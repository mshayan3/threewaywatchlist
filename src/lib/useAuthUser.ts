"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { AppUser } from "@/lib/types";

function toAppUser(u: User | null | undefined): AppUser | null {
  if (!u) return null;
  return {
    id: u.id,
    name:
      u.user_metadata?.full_name ||
      u.user_metadata?.name ||
      u.email ||
      "Someone",
  };
}

// Resolves the current signed-in user on the client and keeps it in sync with
// auth changes. `loading` is true until the first check completes.
export function useAuthUser() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(toAppUser(data.user));
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toAppUser(session?.user));
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
