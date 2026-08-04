import { redirect } from "next/navigation";

// The home page now lives at the site root ("/"), which is public. This legacy
// path just forwards there so old links / bookmarks keep working.
export default function HomeRedirect() {
  redirect("/");
}
