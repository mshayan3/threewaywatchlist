"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { AppUser, Group } from "@/lib/types";

type MyGroupRow = {
  code: string;
  name: string;
  is_owner: boolean;
  member_count: number;
  invite_token: string | null;
};

// Loads the groups the signed-in user belongs to (via the my_groups RPC).
export function useMyGroups(user: AppUser | null) {
  const [myGroups, setMyGroups] = useState<Group[]>([]);

  const reload = useCallback(async () => {
    if (!user) {
      setMyGroups([]);
      return;
    }
    const { data, error } = await supabase.rpc("my_groups");
    if (error) return;
    setMyGroups(
      ((data as MyGroupRow[]) || []).map((g) => ({
        code: g.code,
        name: g.name,
        isOwner: g.is_owner,
        memberCount: Number(g.member_count),
        inviteToken: g.invite_token ?? undefined,
      }))
    );
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { myGroups, reload };
}
