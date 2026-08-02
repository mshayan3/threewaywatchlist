"use client";

import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuthUser } from "@/lib/useAuthUser";
import AppShell from "@/components/AppShell";
import GroupDetail from "@/components/GroupDetail";

// Deep-link / mobile route for a single group. On desktop the master-detail
// /groups page is the primary surface; this keeps shared invite links and the
// mobile "tap a group" flow working. All the data/logic lives in GroupDetail.
export default function GroupPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(
    Array.isArray(params.code) ? params.code[0] : params.code || ""
  );
  const { user } = useAuthUser();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  return (
    <AppShell user={user} onSignOut={signOut} title="Groups">
      <GroupDetail
        code={code}
        onBack={() => router.push("/groups")}
        onExit={() => router.push("/groups")}
      />
    </AppShell>
  );
}
