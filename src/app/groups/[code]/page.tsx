"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { useAuthUser } from "@/lib/useAuthUser";
import { usePersonalLists } from "@/lib/usePersonalLists";
import TopBar from "@/components/TopBar";
import GroupView from "@/components/GroupView";
import Spinner from "@/components/Spinner";
import type { Group, GroupMovie, Member } from "@/lib/types";

const GROUP_POLL_MS = 15000;

type GmRow = {
  tmdb_id: number;
  title: string;
  year: string | null;
  poster: string | null;
  rating: number | null;
  genre: string | null;
  queued_by: { user_id: string; name: string | null }[] | null;
  watched_by: { user_id: string; name: string | null }[] | null;
};

export default function GroupPage() {
  const router = useRouter();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(
    Array.isArray(params.code) ? params.code[0] : params.code || ""
  );

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
    setMembers((memRes.data as Member[]) || []);
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

  // Personal lists power the "is this on my list / have I seen it" state and the
  // add-to-mine action; changes re-derive the group's combined list.
  const personal = usePersonalLists(user, loadGroupMovies);

  // Resolve the group (membership + name/owner) once the user is known.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("groups")
        .select("name, created_by")
        .eq("code", code)
        .maybeSingle();
      if (!active) return;
      if (!data) {
        toast("You're not a member of that group.");
        router.replace("/dashboard");
        return;
      }
      setGroup({ code, name: data.name, isOwner: data.created_by === user.id });
      setResolving(false);
      loadGroupMovies();
    })();
    return () => {
      active = false;
    };
  }, [loading, user, code, router, toast, loadGroupMovies]);

  // Realtime on membership + poll/focus for other members' personal changes.
  useEffect(() => {
    if (!group) return;
    const channel = supabase
      .channel("group-" + code)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_members", filter: `group_code=eq.${code}` },
        () => loadGroupMovies()
      )
      .subscribe();

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

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const handleLeave = async () => {
    if (!group) return;
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
    router.replace("/dashboard");
  };

  const handleDelete = async () => {
    if (!group) return;
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
    router.replace("/dashboard");
  };

  const onAddToMine = async (m: GroupMovie) => {
    await personal.add({
      id: m.tmdbId,
      title: m.title,
      release_date: m.year,
      poster_path: m.poster,
      rating: m.rating,
      genre: m.genre,
    });
    loadGroupMovies();
  };

  const onRemoveFromMine = async (m: GroupMovie) => {
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
  };

  if (loading || resolving || !group) {
    return (
      <>
        <TopBar user={user} onSignOut={signOut} />
        <Spinner />
      </>
    );
  }

  return (
    <>
      <TopBar user={user} onSignOut={signOut} />
      <GroupView
        group={group}
        movies={movies}
        members={members}
        stale={stale}
        myWatchlistIds={personal.watchlistIds}
        myWatchedIds={personal.watchedIds}
        myWatchCounts={personal.watchCounts}
        onBack={() => router.push("/groups")}
        onRetry={loadGroupMovies}
        onAddToMine={onAddToMine}
        onRemoveFromMine={onRemoveFromMine}
        onLeave={handleLeave}
        onDelete={handleDelete}
      />
    </>
  );
}
