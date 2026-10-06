import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { AuthError } from "./errors";

const COOKIE = "yagw_session";
const SESSION_DAYS = 30;
const RENEW_WHEN_DAYS_LEFT = 15;
const DAY_MS = 86_400_000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function randomId(bytes = 16): string {
  return randomBytes(bytes).toString("base64url");
}

export async function createSession(userId: string): Promise<void> {
  const token = randomId(32);
  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_DAYS * DAY_MS),
  });
  // The cookie outlives the session on purpose: expiry is enforced (and extended) in the DB.
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 365 * 86_400,
    path: "/",
  });
}

/** The logged-in user for this request, or null. Memoized per request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const id = hashToken(token);
  const row = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
    .get();
  if (!row) return null;
  const left = row.expiresAt.getTime() - Date.now();
  if (left <= 0) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  if (left < RENEW_WHEN_DAYS_LEFT * DAY_MS) {
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() + SESSION_DAYS * DAY_MS) })
      .where(eq(sessions.id, id));
  }
  return row.user;
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError();
  return user;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  store.delete(COOKIE);
}

/** Client IP as reported by Vercel's proxy (first entry of x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
