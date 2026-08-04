"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import ThemeToggle from "@/components/ThemeToggle";

type Msg = { text: string; kind: "err" | "ok" } | null;

// Multi-color Google "G" mark (official brand colors).
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.76-2.11-6.7-4.94H1.29v3.09A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.31A7.2 7.2 0 0 1 4.92 12c0-.8.14-1.58.38-2.31V6.6H1.29A12 12 0 0 0 0 12c0 1.94.46 3.77 1.29 5.4l4.01-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.18 15.24 0 12 0A12 12 0 0 0 1.29 6.6l4.01 3.09C6.24 6.86 8.88 4.75 12 4.75z" />
    </svg>
  );
}

// Apple logo.
function AppleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 12.04c-.03-2.6 2.13-3.85 2.23-3.91-1.22-1.78-3.11-2.02-3.78-2.05-1.61-.16-3.14.95-3.96.95-.81 0-2.07-.93-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.16-.47 7.83 1.3 10.4.86 1.25 1.89 2.66 3.24 2.61 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.29-1.28 3.15-2.54.99-1.46 1.4-2.87 1.42-2.94-.03-.01-2.73-1.05-2.76-4.16zM14.6 4.32c.72-.87 1.2-2.08 1.07-3.28-1.03.04-2.28.69-3.02 1.56-.66.77-1.24 2-1.08 3.18 1.15.09 2.32-.59 3.03-1.46z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  // Where to land after auth — carries an invite link (/join/<token>) or a
  // gated page through sign-in so the visitor returns where they intended.
  const [next, setNext] = useState("/");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) {
      setMsg({ text: "That sign-in link didn't work. Please try again.", kind: "err" });
    }
    const n = params.get("next");
    // Only allow same-app relative paths (no protocol-relative "//" open redirect).
    if (n && n.startsWith("/") && !n.startsWith("//")) setNext(n);
  }, []);

  const callbackUrl = () =>
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : undefined;

  async function oauth(provider: "google" | "apple") {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl() },
    });
    if (error) {
      setBusy(false);
      setMsg({ text: error.message, kind: "err" });
    }
  }

  async function submitEmail() {
    const mail = email.trim();
    if (!mail) return setMsg({ text: "Enter your email.", kind: "err" });
    if (password.length < 6) {
      return setMsg({ text: "Password should be at least 6 characters.", kind: "err" });
    }

    setBusy(true);
    setMsg(null);

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email: mail,
        password,
        options: { emailRedirectTo: callbackUrl() },
      });
      setBusy(false);
      if (error) return setMsg({ text: error.message, kind: "err" });
      if (!data.session) {
        return setMsg({ text: "Check your email to confirm your account.", kind: "ok" });
      }
      router.push(next);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: mail, password });
    setBusy(false);
    if (error) return setMsg({ text: error.message, kind: "err" });
    router.push(next);
  }

  async function forgotPassword() {
    const mail = email.trim();
    if (!mail) return setMsg({ text: "Enter your email first, then tap reset.", kind: "err" });
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(mail, {
      redirectTo: callbackUrl(),
    });
    setBusy(false);
    if (error) return setMsg({ text: error.message, kind: "err" });
    setMsg({ text: "Password reset link sent — check your email.", kind: "ok" });
  }

  const inputCls =
    "w-full rounded-[14px] border border-border bg-input px-[15px] py-[13px] text-[14.5px] text-text outline-none transition-colors focus:border-accent2";

  const oauthBtn =
    "flex w-full items-center justify-center gap-2.5 rounded-[14px] py-[13px] text-[14.5px] font-semibold transition-colors disabled:opacity-55";

  return (
    <div className="min-h-screen">
      <header className="relative z-[5] mx-auto flex max-w-[1140px] items-center justify-between gap-5 px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-baseline gap-2.5">
          <span className="font-display text-[22px] font-bold tracking-[-0.02em]">Threeway</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted2">
            watchlist
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="view-anim relative z-[2] mx-auto mt-10 max-w-[430px] px-5">
        <div
          className="rounded-[28px] border border-border bg-surface p-[30px] sm:p-[34px]"
          style={{ boxShadow: "var(--card-shadow)" }}
        >
          <h1 className="m-0 mb-1.5 font-display text-[28px] font-extrabold tracking-[-0.02em]">
            {isSignUp ? "Create your account ✨" : "Welcome back 👋"}
          </h1>
          <p className="m-0 mb-6 text-[14.5px] text-dim">
            {isSignUp
              ? "Save films and pool a watchlist with friends."
              : "Sign in to reach your watchlist and groups."}
          </p>

          {/* Google — white button reads clearly in both themes */}
          <button
            onClick={() => oauth("google")}
            disabled={busy}
            className={oauthBtn + " mb-[11px] border border-[#dadce0] bg-white text-[#1f1f1f] hover:bg-[#f7f8f8]"}
          >
            <GoogleIcon />
            Continue with Google
          </button>
          {/* Apple — black button, hairline border so it separates from a dark surface */}
          <button
            onClick={() => oauth("apple")}
            disabled={busy}
            className={oauthBtn + " border border-white/15 bg-black text-white hover:bg-[#1a1a1a]"}
          >
            <AppleIcon />
            Continue with Apple
          </button>

          <div className="my-[22px] flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[12px] text-faint">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <label className="mb-1.5 block text-[13px] font-bold">Email</label>
          <input
            className={inputCls + " mb-4"}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitEmail()}
          />

          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[13px] font-bold">Password</label>
            {!isSignUp && (
              <button
                type="button"
                onClick={forgotPassword}
                className="text-[12.5px] font-semibold text-accent2 hover:underline"
              >
                Forgot?
              </button>
            )}
          </div>
          <input
            className={inputCls + " mb-5"}
            type="password"
            placeholder={isSignUp ? "Create a password" : "••••••••"}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitEmail()}
          />

          <button
            onClick={submitEmail}
            disabled={busy}
            className="w-full rounded-[14px] bg-accent py-[14px] text-[15px] font-bold text-accent-text transition-transform active:scale-[.98] disabled:opacity-55"
          >
            {isSignUp ? "Create account" : "Sign in"}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSignUp((s) => !s);
              setMsg(null);
            }}
            className="mt-4 block w-full text-center text-[13.5px] font-semibold text-dim hover:text-text"
          >
            {isSignUp ? "Already have an account? Sign in" : "New here? Create an account"}
          </button>

          {msg && (
            <p
              className={
                "mt-4 text-center text-[13.5px] font-medium " +
                (msg.kind === "err" ? "text-[var(--bad)]" : "text-[var(--good)]")
              }
            >
              {msg.text}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
