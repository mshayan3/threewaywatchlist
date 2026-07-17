"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuthUser } from "@/lib/useAuthUser";
import { useToast } from "@/components/Toast";
import { initials } from "@/lib/helpers";
import TopBar from "@/components/TopBar";
import Spinner from "@/components/Spinner";
import { Footer } from "@/components/Dashboard";

export default function ProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const { user, loading } = useAuthUser();

  const [displayName, setDisplayName] = useState("");
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Load the existing profile row once we know the user.
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name,nickname,avatar_url,bio")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      setDisplayName(data?.display_name || "");
      setNickname(data?.nickname || "");
      setBio(data?.bio || "");
      setAvatarUrl(data?.avatar_url ?? null);
      setReady(true);
    })();
    return () => {
      active = false;
    };
    // Key on the stable id only — not the whole user object — so re-renders
    // (e.g. from the top-bar avatar) don't refetch and wipe what you're typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Revoke any object URL we created for the local preview.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  function pickFile(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast("Please choose an image file.");
    if (f.size > 5 * 1024 * 1024) return toast("Image must be under 5 MB.");
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function clearAvatar() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setAvatarUrl(null);
  }

  async function save() {
    if (!user) return;
    setBusy(true);
    try {
      let nextAvatar = avatarUrl;

      if (file) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${user.id}/avatar-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(path, file, { upsert: true, cacheControl: "3600" });
        if (upErr) {
          setBusy(false);
          return toast("Avatar upload failed: " + upErr.message);
        }
        nextAvatar = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      }

      const { error } = await supabase.from("profiles").upsert(
        {
          user_id: user.id,
          display_name: displayName.trim() || null,
          nickname: nickname.trim() || null,
          bio: bio.trim() || null,
          avatar_url: nextAvatar,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      setBusy(false);
      if (error) return toast("Couldn't save profile: " + error.message);

      setAvatarUrl(nextAvatar);
      setFile(null);
      if (preview) {
        URL.revokeObjectURL(preview);
        setPreview(null);
      }
      toast("Profile saved");
    } catch (e) {
      setBusy(false);
      toast("Something went wrong: " + (e instanceof Error ? e.message : "unknown error"));
    }
  }

  if (loading || !user || !ready) {
    return (
      <>
        <TopBar user={user} onSignOut={signOut} />
        <Spinner />
      </>
    );
  }

  const shownAvatar = preview || avatarUrl;
  const inputCls =
    "w-full rounded-[14px] border border-border bg-input px-[15px] py-3 text-[14.5px] text-text outline-none transition-colors focus:border-accent";

  return (
    <>
      <TopBar user={user} onSignOut={signOut} />
      <main className="view-anim relative z-[2] mx-auto max-w-[560px] px-4 pt-4 sm:px-6">
        <h1 className="m-0 mb-1.5 font-display text-[clamp(24px,4vw,32px)] font-extrabold tracking-[-0.02em]">
          Your profile
        </h1>
        <p className="m-0 mb-6 text-[15px] text-dim">
          This is how you show up in your groups.
        </p>

        <div
          className="rounded-[20px] border border-border bg-surface p-5 sm:p-6"
          style={{ boxShadow: "var(--card-shadow)" }}
        >
          {/* Avatar */}
          <div className="mb-6 flex items-center gap-4">
            <span
              className="grid h-[76px] w-[76px] flex-none place-items-center overflow-hidden rounded-2xl text-[24px] font-bold text-[#3b2e1e]"
              style={{ background: "#b79a78" }}
            >
              {shownAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shownAvatar} alt="" className="h-full w-full object-cover" />
              ) : (
                initials(displayName || user.name)
              )}
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-[12px] border border-border bg-chip px-4 py-2.5 text-[13px] font-bold text-text transition-colors hover:border-accent"
              >
                {shownAvatar ? "Change photo" : "Upload photo"}
              </button>
              {shownAvatar && (
                <button
                  type="button"
                  onClick={clearAvatar}
                  className="rounded-[12px] border border-border bg-transparent px-4 py-2.5 text-[13px] font-bold text-dim transition-colors hover:border-accent2 hover:text-text"
                >
                  Remove
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <label className="mb-1.5 block text-[13px] font-bold">Display name</label>
          <input
            className={inputCls + " mb-4"}
            placeholder="Your name"
            value={displayName}
            maxLength={60}
            onChange={(e) => setDisplayName(e.target.value)}
          />

          <label className="mb-1.5 block text-[13px] font-bold">
            Nickname <span className="font-normal text-faint">(shown in groups)</span>
          </label>
          <input
            className={inputCls + " mb-4"}
            placeholder="e.g. Shay"
            value={nickname}
            maxLength={30}
            onChange={(e) => setNickname(e.target.value)}
          />

          <label className="mb-1.5 block text-[13px] font-bold">
            Bio <span className="font-normal text-faint">(one line about you)</span>
          </label>
          <textarea
            className={inputCls + " mb-5 resize-none"}
            placeholder="Horror junkie. Will fight you over Nolan rankings."
            value={bio}
            maxLength={140}
            rows={2}
            onChange={(e) => setBio(e.target.value)}
          />

          <button
            disabled={busy}
            onClick={save}
            className="w-full rounded-[14px] bg-accent py-3 text-[15px] font-extrabold text-[var(--accent-text)] transition-transform active:scale-95 disabled:opacity-55"
          >
            {busy ? "Saving…" : "Save profile"}
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
