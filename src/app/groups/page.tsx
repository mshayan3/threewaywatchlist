"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuthUser } from "@/lib/useAuthUser";
import { useMyGroups } from "@/lib/useMyGroups";
import TopBar from "@/components/TopBar";
import GroupsPanel from "@/components/GroupsPanel";
import Spinner from "@/components/Spinner";
import type { Group } from "@/lib/types";

export default function GroupsPage() {
  const router = useRouter();
  const { user, loading } = useAuthUser();
  const { myGroups, reload } = useMyGroups(user);

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
      <GroupsPanel
        user={user}
        myGroups={myGroups}
        onEnter={(g: Group) => router.push(`/groups/${encodeURIComponent(g.code)}`)}
        onChanged={reload}
      />
    </>
  );
}
