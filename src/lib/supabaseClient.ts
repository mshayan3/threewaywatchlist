"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Surfaced at runtime in the browser console if env vars are missing.
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Copy .env.local.example to .env.local and fill them in."
  );
}

// Cookie-based browser client (via @supabase/ssr) so the session is shared with
// the server (middleware + route handlers) rather than living only in
// localStorage. A single instance, reused across the app.
export const supabase: SupabaseClient = createBrowserClient(url ?? "", anonKey ?? "");
