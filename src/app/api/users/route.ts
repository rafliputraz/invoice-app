import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, username, name, role, created_at AS createdAt,
              last_seen AS lastSeen, last_logout AS lastLogout
       FROM users ORDER BY id`
    )
    .all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const { username, password, name, role } = (await req.json()) as {
    username?: string;
    password?: string;
    name?: string;
    role?: string;
  };
  if (!username?.trim() || !password || password.length < 6) {
    return NextResponse.json(
      { error: "Username and a password of at least 6 characters are required" },
      { status: 400 }
    );
  }
  const db = getDb();
  try {
    const result = db
      .prepare(
        "INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)"
      )
      .run(
        username.trim(),
        bcrypt.hashSync(password, 10),
        name?.trim() || username.trim(),
        role === "admin" ? "admin" : "member"
      );
    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Username already exists" },
      { status: 409 }
    );
  }
}
