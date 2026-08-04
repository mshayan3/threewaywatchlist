import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Runs on every matched request: refreshes the Supabase session cookie and
// enforces route protection. Authenticated users are kept out of /login;
// unauthenticated users are kept out of the app (/dashboard, /groups).
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: getUser() revalidates the token with Supabase (don't trust
  // getSession() in middleware).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // Personal / social surfaces stay gated. The home ("/"), search, and the
  // movie / person detail pages are public so signed-out visitors can browse.
  const isProtected =
    path.startsWith("/dashboard") ||
    path.startsWith("/catch-up") ||
    path.startsWith("/watchlist") ||
    path.startsWith("/watched") ||
    path.startsWith("/groups") ||
    path.startsWith("/profile");

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Preserve where they were headed so login can send them back.
    url.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
