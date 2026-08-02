"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The dashboard's watchlist/watched split now lives on dedicated Home ·
// Watchlist · Watched routes. Keep this path alive (old links, the
// login/middleware redirect) by forwarding to Home.
export default function DashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/home");
  }, [router]);
  return null;
}
