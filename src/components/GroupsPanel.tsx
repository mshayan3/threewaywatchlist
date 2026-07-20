"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { colorFor, initials, normalizeCode } from "@/lib/helpers";
import { Count, GroupGrid } from "./MovieRow";
import { useToast } from "./Toast";
import type { AppUser, Group } from "@/lib/types";

interface GroupsPanelProps {
  user: AppUser;
  myGroups: Group[];
  onEnter: (group: Group) => void;
  onChanged: () => void; // reload my_groups in the parent
}

type Tab = "create" | "join" | null;
type Msg = { text: string; kind: "err" | "ok" } | null;

// Build the shareable invite URL for a token, e.g. https://host/join/<token>.
function inviteUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/join/${token}`;
}

// Accept either a full invite URL or a bare token pasted into the join field.
function tokenFromInput(raw: string): string {
  const s = raw.trim();
  const m = s.match(/\/join\/([^/?#\s]+)/);
  if (m) return decodeURIComponent(m[1]);
  return s.replace(/^\/+|\/+$/g, "");
}

export default function GroupsPanel({ user, myGroups, onEnter, onChanged }: GroupsPanelProps) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);

  const [createName, setCreateName] = useState("");
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [joinLink, setJoinLink] = useState("");

  const open = (t: Tab) => {
    setMsg(null);
    setCreatedLink(null);
    setTab((cur) => (cur === t ? null : t));
  };

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      toast("Invite link copied");
    } catch {
      toast("Couldn't copy — select and copy the link manually.");
    }
  }

  async function handleCreate() {
    const name = createName.trim();
    const code = normalizeCode(name);
    if (!name) return setMsg({ text: "Give your group a name.", kind: "err" });
    if (!code) return setMsg({ text: "Group name needs at least one letter or number.", kind: "err" });
    setBusy(true);
    const { data, error } = await supabase.rpc("create_group", {
      p_code: code,
      p_name: name,
      p_user_name: user.name,
    });
    setBusy(false);
    if (error) return setMsg({ text: "Error: " + error.message, kind: "err" });
    if (data === "exists") return setMsg({ text: "That group name is taken — try another.", kind: "err" });
    if (!data || data === "invalid") return setMsg({ text: "Couldn't create the group.", kind: "err" });
    // Success: `data` is the invite token. Show the link so the owner can share
    // it; the new group also appears in the grid below.
    setCreatedLink(inviteUrl(String(data)));
    setMsg({ text: "Group created — share the invite link below.", kind: "ok" });
    onChanged();
  }

  async function handleJoin() {
    const token = tokenFromInput(joinLink);
    if (!token) return setMsg({ text: "Paste the invite link a friend shared with you.", kind: "err" });
    setBusy(true);
    const { data, error } = await supabase.rpc("join_by_token", {
      p_token: token,
      p_user_name: user.name,
    });
    setBusy(false);
    if (error) return setMsg({ text: "Error: " + error.message, kind: "err" });
    if (data === "nogroup") return setMsg({ text: "That invite link isn't valid.", kind: "err" });
    if (!data) return setMsg({ text: "Couldn't join.", kind: "err" });
    onChanged();
    onEnter({ code: String(data) });
  }

  const inputCls =
    "w-full rounded-[10px] border border-border bg-surface2 px-[15px] py-3 text-[14.5px] text-text outline-none transition-colors focus:border-accent";

  return (
    <div className="view-anim">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 mb-1.5 font-display text-[clamp(26px,4vw,34px)] font-semibold tracking-[-0.02em]">
            Your groups
          </h1>
          <p className="m-0 text-[15px] text-dim">
            Shared lists with your crew. Seen movies just quietly disappear.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => open("create")}
            className="flex items-center gap-2 rounded-[11px] bg-accent px-5 py-3 text-[14px] font-semibold text-accent-text transition-transform active:scale-95"
          >
            <PlusIcon /> Create group
          </button>
          <button
            onClick={() => open("join")}
            className="flex items-center gap-2 rounded-[11px] border border-border px-5 py-3 text-[14px] font-semibold text-text transition-colors hover:border-accent2"
          >
            <LinkIcon /> Join with link
          </button>
        </div>
      </div>

      {tab === "create" && (
        <div
          className="mt-6 max-w-[640px] rounded-[16px] border border-border bg-surface p-6 sm:p-7"
          style={{ boxShadow: "var(--card-shadow)" }}
        >
          <div className="text-[15px] font-bold">Create a group</div>
          <div className="mb-5 mt-1 text-[13px] text-faint">
            Name it, then share the invite link — anyone with the link can join.
          </div>
          <div className="flex flex-wrap items-end gap-3.5">
            <div className="min-w-[200px] flex-1">
              <div className="mb-[7px] text-[12px] font-semibold uppercase tracking-[0.02em] text-faint">
                Group name
              </div>
              <input
                className={inputCls}
                placeholder="Sunday Cinema"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <button
              disabled={busy}
              onClick={handleCreate}
              className="rounded-[10px] bg-accent px-7 py-3 text-[14px] font-semibold text-accent-text transition-transform active:scale-95 disabled:opacity-55"
            >
              Create
            </button>
          </div>

          {createdLink && (
            <div className="mt-5 border-t border-border pt-5">
              <div className="mb-[7px] flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.02em] text-faint">
                <LinkIcon /> Invite link
              </div>
              <div className="flex flex-wrap gap-2.5">
                <div className="min-w-[200px] flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-[10px] border border-border bg-surface2 px-[15px] py-3 text-[14px] text-dim">
                  {createdLink}
                </div>
                <button
                  onClick={() => copyLink(createdLink)}
                  className="flex items-center gap-2 rounded-[10px] border border-border px-5 py-3 text-[14px] font-semibold text-text transition-colors hover:border-accent2"
                >
                  <CopyIcon /> Copy
                </button>
              </div>
              <div className="mt-2.5 text-[12.5px] text-faint">
                Only owners can generate or reset this link.
              </div>
            </div>
          )}

          {msg && (
            <p className={"mt-3.5 text-[13.5px] font-medium " + (msg.kind === "err" ? "text-[var(--bad)]" : "text-[var(--good)]")}>
              {msg.text}
            </p>
          )}
        </div>
      )}

      {tab === "join" && (
        <div
          className="mt-6 max-w-[640px] rounded-[16px] border border-border bg-surface p-6 sm:p-7"
          style={{ boxShadow: "var(--card-shadow)" }}
        >
          <div className="text-[15px] font-bold">Join with a link</div>
          <div className="mb-5 mt-1 text-[13px] text-faint">
            Paste the invite link a friend shared with you.
          </div>
          <div className="flex flex-wrap items-end gap-3.5">
            <div className="min-w-[200px] flex-1">
              <input
                className={inputCls}
                placeholder="https://…/join/sunday-cinema-8f2a1c"
                value={joinLink}
                onChange={(e) => setJoinLink(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
            </div>
            <button
              disabled={busy}
              onClick={handleJoin}
              className="rounded-[10px] bg-accent px-7 py-3 text-[14px] font-semibold text-accent-text transition-transform active:scale-95 disabled:opacity-55"
            >
              Join
            </button>
          </div>
          {msg && (
            <p className={"mt-3.5 text-[13.5px] font-medium " + (msg.kind === "err" ? "text-[var(--bad)]" : "text-[var(--good)]")}>
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
        <GroupGrid>
          {myGroups.map((g) => {
            const enter = () => onEnter({ code: g.code, name: g.name });
            return (
              <li key={g.code}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={enter}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      enter();
                    }
                  }}
                  className="flex h-full cursor-pointer flex-col gap-5 rounded-[16px] border border-border bg-surface p-6 text-left transition-transform hover:-translate-y-1 hover:border-accent2"
                  style={{ boxShadow: "var(--card-shadow)" }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="grid h-[52px] w-[52px] flex-none place-items-center rounded-[14px] font-display text-[22px] font-bold text-white"
                      style={{ background: colorFor(g.name || g.code) }}
                    >
                      {initials(g.name || g.code)}
                    </span>
                    {g.isOwner ? (
                      <span className="flex-none rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-accent-text">
                        Owner
                      </span>
                    ) : (
                      <span className="flex-none rounded-full bg-chip px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-faint">
                        Member
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[19px] font-bold tracking-[-0.01em]">
                      {g.name || g.code}
                    </div>
                    <div className="mt-1 text-[13.5px] text-faint">
                      {g.memberCount ?? 0} {g.memberCount === 1 ? "member" : "members"}
                    </div>
                  </div>
                  {g.isOwner && g.inviteToken && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyLink(inviteUrl(g.inviteToken!));
                      }}
                      className="flex items-center justify-center gap-2 rounded-[9px] border border-border py-2.5 text-[13px] font-semibold text-text transition-colors hover:border-accent2"
                    >
                      <CopyIcon /> Copy invite link
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </GroupGrid>
      ) : (
        <p className="rounded-[var(--radius)] border border-dashed border-border px-4 py-10 text-center text-[.95rem] text-faint">
          You&apos;re not in any groups yet — create one, or paste a friend&apos;s invite link to join.
        </p>
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07L11.5 4.5M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07L12.5 19.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
