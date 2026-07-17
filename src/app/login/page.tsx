"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import ThemeToggle from "@/components/ThemeToggle";

type EmailMode = "password" | "magic";
type Msg = { text: string; kind: "err" | "ok" } | null;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<EmailMode>("password");
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) {
      setMsg({ text: "That sign-in link didn't work. Please try again.", kind: "err" });
    }
  }, []);

  const callbackUrl = () =>
    typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

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

    setBusy(true);
    setMsg(null);

    if (mode === "magic") {
      const { error } = await supabase.auth.signInWithOtp({
        email: mail,
        options: { emailRedirectTo: callbackUrl() },
      });
      setBusy(false);
      if (error) return setMsg({ text: error.message, kind: "err" });
      return setMsg({ text: "Check your email for a sign-in link.", kind: "ok" });
    }

    if (password.length < 6) {
      setBusy(false);
      return setMsg({ text: "Password should be at least 6 characters.", kind: "err" });
    }

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
      router.push("/dashboard");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: mail, password });
    setBusy(false);
    if (error) return setMsg({ text: error.message, kind: "err" });
    router.push("/dashboard");
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
    "w-full rounded-[14px] border border-border bg-input px-[15px] py-[13px] text-[14.5px] text-text outline-none transition-colors focus:border-accent";

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
            Sign in to reach your watchlist and groups.
          </p>

          <button
            onClick={() => oauth("google")}
            disabled={busy}
            className="mb-[11px] flex w-full items-center justify-center gap-2.5 rounded-[14px] border border-border bg-chip py-[13px] text-[14.5px] font-bold text-text transition-colors hover:border-accent disabled:opacity-55"
          >
            <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-white text-[12px] font-extrabold text-[#4285F4]">
              G
            </span>
            Continue with Google
          </button>
          <button
            onClick={() => oauth("apple")}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2.5 rounded-[14px] bg-black py-[13px] text-[14.5px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-55"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M16.365 1.43c0 1.14-.417 2.2-1.11 3-.79.905-2.08 1.6-3.15 1.52-.14-1.13.42-2.31 1.06-3.05.78-.9 2.16-1.55 3.2-1.47zM20.5 17.2c-.6 1.38-.88 1.99-1.66 3.2-1.08 1.68-2.6 3.77-4.48 3.79-1.67.01-2.1-1.09-4.37-1.08-2.27.01-2.74 1.1-4.41 1.09-1.88-.02-3.32-1.9-4.4-3.58C-1.34 16.36-1.6 10.6.7 7.6c1.13-1.47 2.9-2.4 4.55-2.4 1.68 0 2.74 1.1 4.13 1.1 1.35 0 2.17-1.1 4.11-1.1 1.46 0 3.01.8 4.11 2.17-3.62 1.98-3.03 7.15.79 7.83z" />
            </svg>
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

          {mode === "password" && (
            <>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[13px] font-bold">Password</label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={forgotPassword}
                    className="text-[12.5px] font-medium text-accent2 hover:underline"
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
            </>
          )}

          <button
            onClick={submitEmail}
            disabled={busy}
            className="w-full rounded-[14px] bg-accent py-[14px] text-[15px] font-bold text-[var(--accent-text)] transition-transform active:scale-[.98] disabled:opacity-55"
          >
            {mode === "magic" ? "Send magic link" : isSignUp ? "Create account" : "Sign in"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === "password" ? "magic" : "password"));
              setMsg(null);
            }}
            className="mt-4 block w-full text-center text-[13px] font-medium text-dim hover:text-text"
          >
            {mode === "password" ? "Email me a magic link instead" : "Use a password instead"}
          </button>
          {mode === "password" && (
            <button
              type="button"
              onClick={() => {
                setIsSignUp((s) => !s);
                setMsg(null);
              }}
              className="mt-1.5 block w-full text-center text-[13.5px] font-bold text-accent2 hover:underline"
            >
              {isSignUp ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
          )}

          {msg && (
            <p
              className={
                "mt-4 text-center text-[13.5px] font-medium " +
                (msg.kind === "err" ? "text-accent2" : "text-accent")
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
