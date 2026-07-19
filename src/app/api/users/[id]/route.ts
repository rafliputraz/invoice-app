import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

// Admin action: change a user's role, or reset their password.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getSessionUser();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const { id } = await params;
  const { role, password } = (await req.json()) as {
    role?: string;
    password?: string;
  };
  const db = getDb();

  // Password reset (admin sets a new password directly, no old one needed).
  if (password !== undefined) {
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter" },
        { status: 400 }
      );
    }
    const result = db
      .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
      .run(bcrypt.hashSync(password, 10), Number(id));
    if (result.changes === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ id: Number(id), passwordReset: true });
  }

  // Role change.
  if (role !== "admin" && role !== "member") {
    return NextResponse.json(
      { error: "role must be 'admin' or 'member'" },
      { status: 400 }
    );
  }
  // Block self role-change so an admin can't accidentally lock themselves out.
  if (Number(id) === me.id) {
    return NextResponse.json(
      { error: "Anda tidak bisa mengubah role sendiri" },
      { status: 400 }
    );
  }
  const result = db
    .prepare("UPDATE users SET role = ? WHERE id = ?")
    .run(role, Number(id));
  if (result.changes === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ id: Number(id), role });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getSessionUser();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const { id } = await params;
  if (Number(id) === me.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 }
    );
  }
  const db = getDb();
  db.prepare("DELETE FROM users WHERE id = ?").run(Number(id));
  return NextResponse.json({ ok: true });
}
