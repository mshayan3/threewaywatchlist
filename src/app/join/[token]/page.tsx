"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/Toast";
import { useAuthUser } from "@/lib/useAuthUser";
import Spinner from "@/components/Spinner";

// Lands here from a shared invite link (/join/<token>). Signed-out visitors are
// sent to login and returned here afterward; signed-in visitors are joined to
// the group the token points at and forwarded into it.
export default function JoinPage() {
  const router = useRouter();
  const toast = useToast();
  const params = useParams<{ token: string }>();
  const token = decodeURIComponent(
    Array.isArray(params.token) ? params.token[0] : params.token || ""
  );
  const { user, loading } = useAuthUser();
  const ran = useRef(false);

  useEffect(() => {
    if (loading || ran.current) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/join/${token}`)}`);
      return;
    }
    ran.current = true;
    (async () => {
      const { data, error } = await supabase.rpc("join_by_token", {
        p_token: token,
        p_user_name: user.name,
      });
      if (error) {
        toast("Couldn't join: " + error.message);
        return router.replace("/groups");
      }
      if (!data || data === "nogroup") {
        toast("That invite link isn't valid.");
        return router.replace("/groups");
      }
      toast("Joined the group");
      router.replace(`/groups/${encodeURIComponent(String(data))}`);
    })();
  }, [loading, user, token, router, toast]);

  return <Spinner />;
}
