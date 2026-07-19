import { SignJWT, jwtVerify } from "jose";

// NOTE: keep this file free of next/headers imports — it is bundled into the
// edge middleware. Cookie reading lives in auth-server.ts.

export const SESSION_COOKIE = "sfl_session";
// Sliding idle window: the session expires this long after the last activity.
// The client refreshes it (heartbeat) while active, so an idle/closed tab is
// logged out server-side even if JavaScript isn't running.
export const SESSION_TTL_MINUTES = 15;

export interface SessionUser {
  id: number;
  username: string;
  name: string;
  role: "admin" | "member";
}

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET env variable is required in production");
    }
    return new TextEncoder().encode("dev-only-insecure-secret");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    username: user.username,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_MINUTES}m`)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      id: Number(payload.sub),
      username: String(payload.username),
      name: String(payload.name),
      role: payload.role === "admin" ? "admin" : "member",
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    // AUTH_INSECURE_COOKIE=1 is a TEMPORARY escape hatch for accessing the
    // app over plain http (e.g. by IP before DNS/HTTPS is ready).
    // Remove it from .env as soon as the site is served over HTTPS.
    secure:
      process.env.NODE_ENV === "production" &&
      process.env.AUTH_INSECURE_COOKIE !== "1",
    path: "/",
    maxAge: SESSION_TTL_MINUTES * 60,
  };
}
