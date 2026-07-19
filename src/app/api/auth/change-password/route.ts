import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

// Any logged-in user changes their OWN password (verifies the current one).
export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  const { currentPassword, newPassword } = (await req.json()) as {
    currentPassword?: string;
    newPassword?: string;
  };
  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json(
      { error: "Password baru minimal 6 karakter" },
      { status: 400 }
    );
  }
  const db = getDb();
  const row = db
    .prepare("SELECT password_hash AS hash FROM users WHERE id = ?")
    .get(me.id) as { hash: string } | undefined;
  if (!row) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!bcrypt.compareSync(currentPassword ?? "", row.hash)) {
    return NextResponse.json(
      { error: "Password saat ini salah" },
      { status: 400 }
    );
  }
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
    bcrypt.hashSync(newPassword, 10),
    me.id
  );
  return NextResponse.json({ ok: true });
}
