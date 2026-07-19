import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { getSessionUser } from "@/lib/auth-server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  // Stamp the logout time so the online indicator shows them offline at once.
  try {
    const user = await getSessionUser();
    if (user) {
      getDb()
        .prepare(
          "UPDATE users SET last_logout = datetime('now', 'localtime') WHERE id = ?"
        )
        .run(user.id);
    }
  } catch {
    // ignore — clearing the cookie below still logs them out
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
