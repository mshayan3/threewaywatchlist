"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { AppUser } from "@/lib/types";

interface ProfileRow {
  display_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  bio: string | null;
}

function baseName(u: User): string {
  return u.user_metadata?.full_name || u.user_metadata?.name || u.email || "Someone";
}

function toAppUser(u: User, profile: ProfileRow | null): AppUser {
  return {
    id: u.id,
    name: profile?.display_name?.trim() || baseName(u),
    displayName: profile?.display_name ?? undefined,
    nickname: profile?.nickname ?? undefined,
    avatarUrl: profile?.avatar_url ?? null,
    bio: profile?.bio ?? undefined,
  };
}

// Resolves the current signed-in user on the client (merged with their profile
// row) and keeps it in sync with auth + profile changes. `loading` is true
// until the first check completes.
export function useAuthUser() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name,nickname,avatar_url,bio")
      .eq("user_id", id)
      .maybeSingle();
    setProfile((data as ProfileRow) ?? null);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      setAuthUser(data.user ?? null);
      if (data.user) await loadProfile(data.user.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setAuthUser(u);
      if (u) loadProfile(u.id);
      else setProfile(null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  // Keep the top-bar name/avatar live when the profile is edited elsewhere.
  useEffect(() => {
    if (!authUser) return;
    const channel = supabase
      .channel("profile-" + authUser.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${authUser.id}` },
        () => loadProfile(authUser.id)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser, loadProfile]);

  const user: AppUser | null = authUser ? toAppUser(authUser, profile) : null;
  return { user, loading };
}
