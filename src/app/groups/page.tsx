"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuthUser } from "@/lib/useAuthUser";
import { useMyGroups } from "@/lib/useMyGroups";
import AppShell from "@/components/AppShell";
import GroupsPanel from "@/components/GroupsPanel";
import GroupDetail from "@/components/GroupDetail";
import Spinner from "@/components/Spinner";
import type { Group } from "@/lib/types";

// Tracks whether we're at the desktop (lg) breakpoint, where Groups is a
// master–detail: the rail selects a group in place rather than navigating.
function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return desktop;
}

export default function GroupsPage() {
  const router = useRouter();
  const { user, loading } = useAuthUser();
  const { myGroups, reload } = useMyGroups(user);
  const [selected, setSelected] = useState<string | null>(null);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // On desktop, open the first group by default; keep the selection valid as the
  // group list changes (e.g. after leaving one).
  useEffect(() => {
    if (!isDesktop) return;
    if (myGroups.length === 0) {
      setSelected(null);
    } else if (!selected || !myGroups.some((g) => g.code === selected)) {
      setSelected(myGroups[0].code);
    }
  }, [isDesktop, myGroups, selected]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  if (loading || !user) {
    return (
      <AppShell user={null} onSignOut={signOut}>
        <Spinner />
      </AppShell>
    );
  }

  const enter = (g: Group) => {
    if (isDesktop) setSelected(g.code);
    else router.push(`/groups/${encodeURIComponent(g.code)}`);
  };

  return (
    <AppShell user={user} onSignOut={signOut}>
      <div className="lg:flex lg:gap-8">
        <div className="lg:w-[320px] lg:flex-none">
          <GroupsPanel
            user={user}
            myGroups={myGroups}
            onEnter={enter}
            onChanged={reload}
            compact={isDesktop}
            selectedCode={selected}
          />
        </div>
        <div className="hidden lg:block lg:min-w-0 lg:flex-1 lg:border-l lg:border-line lg:pl-8">
          <GroupDetail
            code={selected}
            embedded
            onExit={() => {
              setSelected(null);
              reload();
            }}
          />
        </div>
      </div>
    </AppShell>
  );
}
