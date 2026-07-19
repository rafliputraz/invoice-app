import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  // Refresh the "last active" stamp — the client calls this as a heartbeat.
  try {
    getDb()
      .prepare(
        "UPDATE users SET last_seen = datetime('now', 'localtime') WHERE id = ?"
      )
      .run(user.id);
  } catch {
    // column may not exist on a very old DB; ignore
  }
  // Slide the session forward so an active user stays logged in; an idle one
  // (no heartbeat) lets the cookie expire.
  const res = NextResponse.json(user);
  try {
    const token = await createSessionToken(user);
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  } catch {
    // if re-issuing fails, the existing cookie still stands
  }
  return res;
}
