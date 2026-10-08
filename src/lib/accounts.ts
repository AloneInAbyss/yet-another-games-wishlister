import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { accounts, collectionItems, collections, sessions, users, wishlistItems, type User } from "@/db/schema";
import { createSession, getCurrentUser, randomId } from "./auth";
import { UserError } from "./errors";
import { enforce } from "./rate-limit";
import { suggestUsername } from "./validation";

export type Provider = (typeof accounts.$inferSelect)["provider"];

export type ProviderProfile = {
  provider: Provider;
  providerAccountId: string;
  displayName: string;
  avatarUrl: string | null;
};

export const homePath = (user: Pick<User, "username">) => (user.username ? `/u/${user.username}` : "/onboarding");

/**
 * Handles the end of a login flow. Signs in an existing account, links the provider when
 * someone is already logged in, or creates a new user. Returns where to redirect next.
 */
export async function signInWithProvider(profile: ProviderProfile, ip: string): Promise<string> {
  const current = await getCurrentUser();
  const existing = await db.query.accounts.findFirst({
    where: and(eq(accounts.provider, profile.provider), eq(accounts.providerAccountId, profile.providerAccountId)),
  });

  if (existing) {
    if (current && current.id !== existing.userId) return "/settings?error=account_in_use";
    if (!current) await createSession(existing.userId);
    const user = await db.query.users.findFirst({ where: eq(users.id, existing.userId) });
    return user ? homePath(user) : "/";
  }

  if (current) {
    const sameProvider = await db.query.accounts.findFirst({
      where: and(eq(accounts.userId, current.id), eq(accounts.provider, profile.provider)),
    });
    if (sameProvider) return "/settings?error=provider_already_linked";
    await db.insert(accounts).values({
      userId: current.id,
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
    });
    if (!current.avatarUrl && profile.avatarUrl) {
      await db.update(users).set({ avatarUrl: profile.avatarUrl }).where(eq(users.id, current.id));
    }
    return `/settings?linked=${profile.provider}`;
  }

  await enforce("signupIp", ip);
  const userId = randomId();
  await db.batch([
    db.insert(users).values({
      id: userId,
      displayName: profile.displayName.slice(0, 60) || "Jogador",
      avatarUrl: profile.avatarUrl,
    }),
    db.insert(accounts).values({
      userId,
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
    }),
  ]);
  await createSession(userId);
  return "/onboarding";
}

export async function getSteamId(userId: string): Promise<string | null> {
  const row = await db.query.accounts.findFirst({
    where: and(eq(accounts.userId, userId), eq(accounts.provider, "steam")),
  });
  return row?.providerAccountId ?? null;
}

export async function isUsernameTaken(username: string, exceptUserId?: string): Promise<boolean> {
  const row = await db.query.users.findFirst({ where: eq(users.username, username) });
  return !!row && row.id !== exceptUserId;
}

export async function setUsername(userId: string, username: string) {
  if (await isUsernameTaken(username, userId)) throw new UserError("Esse nome já está em uso.");
  await db.update(users).set({ username }).where(eq(users.id, userId));
}

/** A free username based on the display name (e.g. "aloneinabyss", "aloneinabyss2"). */
export async function availableUsername(displayName: string): Promise<string> {
  const base = suggestUsername(displayName).slice(0, 17);
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base}${i + 1}`;
    if (!(await isUsernameTaken(candidate))) return candidate;
  }
  return `${base}${Math.floor(Math.random() * 900 + 100)}`;
}

export async function setListVisibility(userId: string, listPublic: boolean) {
  await db.update(users).set({ listPublic }).where(eq(users.id, userId));
}

export async function deleteUser(userId: string) {
  // Explicit deletes: SQLite only cascades when foreign keys are enforced on the connection.
  const userItems = db.select({ id: wishlistItems.id }).from(wishlistItems).where(eq(wishlistItems.userId, userId));
  const userCollections = db.select({ id: collections.id }).from(collections).where(eq(collections.userId, userId));
  await db.batch([
    db.delete(collectionItems).where(inArray(collectionItems.itemId, userItems)),
    db.delete(collectionItems).where(inArray(collectionItems.collectionId, userCollections)),
    db.delete(collections).where(eq(collections.userId, userId)),
    db.delete(wishlistItems).where(eq(wishlistItems.userId, userId)),
    db.delete(sessions).where(eq(sessions.userId, userId)),
    db.delete(accounts).where(eq(accounts.userId, userId)),
    db.delete(users).where(eq(users.id, userId)),
  ]);
}

export async function getUserByUsername(username: string) {
  return db.query.users.findFirst({ where: eq(users.username, username.toLowerCase()) });
}
