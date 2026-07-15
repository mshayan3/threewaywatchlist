"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { initials, normalizeCode } from "@/lib/helpers";
import { Count } from "./MovieRow";
import { Footer } from "./Dashboard";
import type { AppUser, Group } from "@/lib/types";

interface GroupsPanelProps {
  user: AppUser;
  myGroups: Group[];
  onEnter: (group: Group) => void;
  onChanged: () => void; // reload my_groups in the parent
}

type Tab = "create" | "join" | null;
type Msg = { text: string; kind: "err" | "ok" } | null;

export default function GroupsPanel({ user, myGroups, onEnter, onChanged }: GroupsPanelProps) {
  const [tab, setTab] = useState<Tab>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);

  const [joinName, setJoinName] = useState("");
  const [joinPass, setJoinPass] = useState("");
  const [createName, setCreateName] = useState("");
  const [createPass, setCreatePass] = useState("");

  const open = (t: Tab) => {
    setMsg(null);
    setTab((cur) => (cur === t ? null : t));
  };

  async function handleCreate() {
    const name = createName.trim();
    const code = normalizeCode(name);
    if (!name) return setMsg({ text: "Give your group a name.", kind: "err" });
    if (!code) return setMsg({ text: "Group name needs at least one letter or number.", kind: "err" });
    if (createPass.length < 4) return setMsg({ text: "Password should be at least 4 characters.", kind: "err" });
    setBusy(true);
    const { data, error } = await supabase.rpc("create_group", {
      p_code: code,
      p_name: name,
      p_password: createPass,
      p_user_name: user.name,
    });
    setBusy(false);
    if (error) return setMsg({ text: "Error: " + error.message, kind: "err" });
    if (data === "exists") return setMsg({ text: "That group name is taken — try another.", kind: "err" });
    if (data !== "ok") return setMsg({ text: "Couldn't create the group.", kind: "err" });
    onChanged();
    onEnter({ code, name });
  }

  async function handleJoin() {
    const name = joinName.trim();
    const code = normalizeCode(name);
    if (!code) return setMsg({ text: "Enter the group name.", kind: "err" });
    if (!joinPass) return setMsg({ text: "Enter the password.", kind: "err" });
    setBusy(true);
    const { data, error } = await supabase.rpc("join_group", {
      p_code: code,
      p_password: joinPass,
      p_user_name: user.name,
    });
    setBusy(false);
    if (error) return setMsg({ text: "Error: " + error.message, kind: "err" });
    if (data === "nogroup") return setMsg({ text: "No group with that name.", kind: "err" });
    if (data === "badpw") return setMsg({ text: "Wrong password.", kind: "err" });
    if (data !== "ok") return setMsg({ text: "Couldn't join.", kind: "err" });
    onChanged();
    onEnter({ code });
  }

  const inputCls =
    "w-full rounded-[14px] border border-border bg-input px-[15px] py-3 text-[14.5px] text-text outline-none transition-colors focus:border-accent";

  return (
    <main className="view-anim relative z-[2] mx-auto max-w-[1000px] px-6 pt-4">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 mb-1.5 font-display text-[clamp(26px,4vw,34px)] font-extrabold tracking-[-0.02em]">
            Your groups 🍿
          </h1>
          <p className="m-0 text-[15px] text-dim">
            Your watchlist is pooled into every group you join.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => open("create")}
            className="rounded-xl bg-accent px-5 py-3 text-[14.5px] font-extrabold text-[var(--accent-text)] transition-transform active:scale-95"
            style={{ boxShadow: "0 12px 26px -12px var(--accent-glow)" }}
          >
            + Create group
          </button>
          <button
            onClick={() => open("join")}
            className="rounded-xl border border-border bg-chip px-5 py-3 text-[14.5px] font-bold text-text transition-colors hover:border-accent"
          >
            Join with password
          </button>
        </div>
      </div>

      {tab && (
        <div className="mt-4 rounded-[20px] border border-border bg-surface p-5" style={{ boxShadow: "var(--card-shadow)" }}>
          {tab === "create" ? (
            <>
              <label className="mb-1.5 block text-[13px] font-bold">
                Group name{" "}
                <span className="font-normal text-faint">(friends type this to join)</span>
              </label>
              <input
                className={inputCls + " mb-3.5"}
                placeholder="Movie Night Crew"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <label className="mb-1.5 block text-[13px] font-bold">Password</label>
              <input
                className={inputCls + " mb-4"}
                type="password"
                placeholder="Set a password"
                value={createPass}
                onChange={(e) => setCreatePass(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <button
                disabled={busy}
                onClick={handleCreate}
                className="w-full rounded-[14px] bg-accent py-3 text-[15px] font-extrabold text-[var(--accent-text)] transition-transform active:scale-95 disabled:opacity-55"
              >
                Create group
              </button>
            </>
          ) : (
            <>
              <label className="mb-1.5 block text-[13px] font-bold">Group name</label>
              <input
                className={inputCls + " mb-3.5"}
                placeholder="Movie Night Crew"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
              <label className="mb-1.5 block text-[13px] font-bold">Password</label>
              <input
                className={inputCls + " mb-4"}
                type="password"
                placeholder="••••••••"
                value={joinPass}
                onChange={(e) => setJoinPass(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
              <button
                disabled={busy}
                onClick={handleJoin}
                className="w-full rounded-[14px] bg-accent py-3 text-[15px] font-extrabold text-[var(--accent-text)] transition-transform active:scale-95 disabled:opacity-55"
              >
                Join group
              </button>
            </>
          )}
          {msg && (
            <p className={"mt-3.5 text-center text-[13.5px] font-medium " + (msg.kind === "err" ? "text-accent2" : "text-accent")}>
              {msg.text}
            </p>
          )}
        </div>
      )}

      <div className="mb-3.5 mt-8 flex items-center gap-2.5">
        <h2 className="m-0 font-display text-[19px] font-bold">Joined groups</h2>
        <Count>{myGroups.length}</Count>
      </div>

      {myGroups.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {myGroups.map((g) => (
            <button
              key={g.code}
              onClick={() => onEnter({ code: g.code, name: g.name })}
              className="flex items-center justify-between rounded-[20px] border border-border bg-surface p-[18px] text-left transition-transform hover:-translate-y-1 hover:border-accent"
              style={{ boxShadow: "var(--card-shadow)" }}
            >
              <span className="flex min-w-0 items-center gap-3.5">
                <span
                  className="grid h-[46px] w-[46px] flex-none place-items-center rounded-[14px] text-[15px] font-extrabold text-[var(--accent-text)]"
                  style={{ background: "conic-gradient(from 210deg, var(--accent), var(--accent2))" }}
                >
                  {initials(g.name || g.code)}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-[16px] font-bold">
                    <span className="truncate">{g.name || g.code}</span>
                    {g.isOwner && (
                      <span className="flex-none rounded-full bg-accent px-2 py-0.5 text-[10px] font-extrabold tracking-[0.04em] text-[var(--accent-text)]">
                        OWNER
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-dim">
                    {g.memberCount ?? 0} {g.memberCount === 1 ? "member" : "members"}
                  </span>
                </span>
              </span>
              <span className="flex-none text-[18px] text-faint">›</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-[var(--radius)] border border-dashed border-border px-4 py-10 text-center text-[.95rem] text-faint">
          You&apos;re not in any groups yet — create one or join with a friend&apos;s group name + password.
        </p>
      )}

      <Footer />
    </main>
  );
}
