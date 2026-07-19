import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  // Refresh the "last active" stamp — called once per page load by the shell.
  try {
    getDb()
      .prepare(
        "UPDATE users SET last_seen = datetime('now', 'localtime') WHERE id = ?"
      )
      .run(user.id);
  } catch {
    // column may not exist on a very old DB; ignore
  }
  return NextResponse.json(user);
}
