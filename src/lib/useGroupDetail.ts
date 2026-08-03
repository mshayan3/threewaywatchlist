"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { useAuthUser } from "@/lib/useAuthUser";
import { usePersonalLists } from "@/lib/usePersonalLists";
import type { Group, GroupMovie, Member } from "@/lib/types";

const GROUP_POLL_MS = 15000;

type GmRow = {
  tmdb_id: number;
  title: string;
  year: string | null;
  poster: string | null;
  rating: number | null;
  genre: string | null;
  queued_by: { user_id: string; name: string | null; avatar_url: string | null }[] | null;
  watched_by: { user_id: string; name: string | null; avatar_url: string | null }[] | null;
};

type ProfileLite = {
  user_id: string;
  nickname: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

// Owns everything a single group's detail pane needs: resolve membership,
// load the derived combined movie list + members, keep them fresh (realtime on
// membership, poll/focus for other members' personal changes), and expose the
// personal add/remove + leave/delete actions. Shared by the /groups
// master-detail pane and the /groups/[code] deep-link route.
//
// Pass a null/empty `code` to stand down (the master-detail pane with nothing
// selected). `onExit` runs after a successful leave/delete.
export function useGroupDetail(code: string | null, onExit?: () => void) {
  const router = useRouter();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const { user, loading } = useAuthUser();

  const [group, setGroup] = useState<Group | null>(null);
  const [movies, setMovies] = useState<GroupMovie[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [stale, setStale] = useState(false);
  const [resolving, setResolving] = useState(true);

  const loadGroupMovies = useCallback(async () => {
    if (!code) return;
    const [gmRes, memRes] = await Promise.all([
      supabase.rpc("group_movies", { p_code: code }),
      supabase.from("group_members").select("user_id,user_name").eq("group_code", code),
    ]);
    if (gmRes.error || memRes.error) {
      setStale(true);
      toast("Couldn't refresh the group: " + (gmRes.error || memRes.error)!.message);
      return;
    }

    const rawMembers = (memRes.data as { user_id: string; user_name: string | null }[]) || [];
    const ids = rawMembers.map((m) => m.user_id);
    const profs: Record<string, ProfileLite> = {};
    if (ids.length) {
      const { data: pdata } = await supabase
        .from("profiles")
        .select("user_id,nickname,display_name,avatar_url")
        .in("user_id", ids);
      for (const p of (pdata as ProfileLite[]) || []) profs[p.user_id] = p;
    }
    setMembers(
      rawMembers.map((m) => {
        const p = profs[m.user_id];
        return {
          user_id: m.user_id,
          user_name: m.user_name,
          name: p?.nickname?.trim() || p?.display_name?.trim() || m.user_name,
          avatar_url: p?.avatar_url ?? null,
        };
      })
    );
    const mapped: GroupMovie[] = ((gmRes.data as GmRow[]) || []).map((r) => ({
      tmdbId: r.tmdb_id,
      title: r.title,
      year: r.year || "",
      poster: r.poster || "",
      rating: r.rating ?? 0,
      genre: r.genre || "",
      queuedBy: r.queued_by || [],
      watchedBy: r.watched_by || [],
    }));
    setMovies(mapped);
    setStale(false);
  }, [code, toast]);

  const personal = usePersonalLists(user, loadGroupMovies);

  // Resolve the group (membership + name/owner) once the user + code are known.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!code) {
      setGroup(null);
      setMovies([]);
      setMembers([]);
      setResolving(false);
      return;
    }
    let active = true;
    setResolving(true);
    (async () => {
      const { data } = await supabase
        .from("groups")
        .select("name, created_by, invite_token")
        .eq("code", code)
        .maybeSingle();
      if (!active) return;
      if (!data) {
        toast("You're not a member of that group.");
        setGroup(null);
        setResolving(false);
        return;
      }
      setGroup({
        code,
        name: data.name,
        isOwner: data.created_by === user.id,
        inviteToken: data.invite_token ?? undefined,
      });
      setResolving(false);
      loadGroupMovies();
    })();
    return () => {
      active = false;
    };
  }, [loading, user, code, router, toast, loadGroupMovies]);

  // Realtime on membership + poll/focus for other members' personal changes.
  useEffect(() => {
    if (!group || !code) return;
    const channel = supabase
      .channel(`group-${code}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_members", filter: `group_code=eq.${code}` },
        () => loadGroupMovies()
      )
      .subscribe((status: string) => {
        // Re-sync once live, so a membership change between the resolve effect's
        // initial load and this subscription connecting isn't missed.
        if (status === "SUBSCRIBED") loadGroupMovies();
      });

    const tick = () => {
      if (document.visibilityState === "visible") loadGroupMovies();
    };
    const id = window.setInterval(tick, GROUP_POLL_MS);
    window.addEventListener("focus", tick);
    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(id);
      window.removeEventListener("focus", tick);
    };
  }, [group, code, loadGroupMovies]);

  const onAddToMine = useCallback(
    async (m: GroupMovie) => {
      await personal.add({
        id: m.tmdbId,
        title: m.title,
        release_date: m.year,
        poster_path: m.poster,
        rating: m.rating,
        genre: m.genre,
      });
      loadGroupMovies();
    },
    [personal, loadGroupMovies]
  );

  const onRemoveFromMine = useCallback(
    async (m: GroupMovie) => {
      await personal.removeFromWatchlist({
        tmdbId: m.tmdbId,
        title: m.title,
        year: m.year,
        poster: m.poster,
        rating: m.rating,
        genre: m.genre,
        at: "",
        watchCount: 0,
      });
      loadGroupMovies();
    },
    [personal, loadGroupMovies]
  );

  // Owner-only: remove another member from the group. Their personal lists are
  // untouched; only their membership row goes.
  const onRemoveMember = useCallback(
    async (m: Member) => {
      if (!group || !code) return;
      const label = m.name || m.user_name || "this member";
      if (
        !(await confirmDialog({
          title: `Remove ${label}?`,
          message: "They lose access to this group. Their personal lists stay theirs.",
          confirmLabel: "Remove",
          danger: true,
        }))
      )
        return;
      const { data, error } = await supabase.rpc("remove_member", {
        p_code: code,
        p_user: m.user_id,
      });
      if (error) return toast("Couldn't remove: " + error.message);
      if (data === "notowner") return toast("Only the group owner can remove members.");
      if (data === "self") return toast('Use "Delete group" to remove yourself.');
      if (data === "nogroup") return toast("Group not found.");
      toast(`Removed ${label}`);
      loadGroupMovies();
    },
    [group, code, confirmDialog, toast, loadGroupMovies]
  );

  const onLeave = useCallback(async () => {
    if (!group || !code) return;
    if (
      !(await confirmDialog({
        title: `Leave "${group.name}"?`,
        message: "Your movies stay on your personal list.",
        confirmLabel: "Leave",
        danger: true,
      }))
    )
      return;
    const { error } = await supabase.rpc("leave_group", { p_code: code });
    if (error) return toast("Couldn't leave: " + error.message);
    toast("You left the group");
    onExit ? onExit() : router.replace("/groups");
  }, [group, code, confirmDialog, toast, onExit, router]);

  const onDelete = useCallback(async () => {
    if (!group || !code) return;
    if (
      !(await confirmDialog({
        title: `Delete "${group.name}" for everyone?`,
        message: "Members keep their personal lists.",
        confirmLabel: "Delete",
        danger: true,
      }))
    )
      return;
    const { data, error } = await supabase.rpc("delete_group", { p_code: code });
    if (error) return toast("Couldn't delete: " + error.message);
    if (data === "notowner") return toast("Only the creator can delete this group.");
    if (data === "nogroup") return toast("Group not found.");
    toast("Group deleted");
    onExit ? onExit() : router.replace("/groups");
  }, [group, code, confirmDialog, toast, onExit, router]);

  return {
    user,
    loading,
    group,
    movies,
    members,
    stale,
    resolving,
    personal,
    loadGroupMovies,
    onAddToMine,
    onRemoveFromMine,
    onRemoveMember,
    onLeave,
    onDelete,
  };
}
