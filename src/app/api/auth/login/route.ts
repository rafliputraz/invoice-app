import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { username, password } = (await req.json()) as {
    username?: string;
    password?: string;
  };
  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required" },
      { status: 400 }
    );
  }

  const db = getDb();
  const user = db
    .prepare(
      "SELECT id, username, password_hash AS passwordHash, name, role FROM users WHERE username = ?"
    )
    .get(username.trim()) as
    | {
        id: number;
        username: string;
        passwordHash: string;
        name: string;
        role: "admin" | "member";
      }
    | undefined;

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  }

  const token = await createSessionToken({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  });
  const res = NextResponse.json({
    username: user.username,
    name: user.name,
    role: user.role,
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
