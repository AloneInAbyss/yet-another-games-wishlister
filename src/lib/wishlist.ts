import "server-only";
import { and, asc, count, eq, inArray, isNull, lt, max, min, notInArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { collectionItems, games, sessions, wishlistItems, type Game } from "@/db/schema";
import { getItemCollections, linkItem } from "./collections-db";
import { SteamUnavailableError, UserError } from "./errors";
import { pruneRateLimits } from "./rate-limit";
import { fetchItems, fetchWishlist, type StoreItem } from "./steam";
import { MAX_ITEMS_PER_LIST } from "./validation";

const FRESH_FOR_IMPORT_MS = 24 * 3600_000;
const FRESH_FOR_MANUAL_REFRESH_MS = 15 * 60_000;

export type WishlistEntry = {
  id: number;
  position: number;
  durationHours: number | null;
  notes: string | null;
  addedAt: Date;
  collectionIds: number[];
  game: Game;
};

export async function getWishlist(userId: string): Promise<WishlistEntry[]> {
  const [rows, itemCollections] = await Promise.all([
    db
      .select()
      .from(wishlistItems)
      .innerJoin(games, eq(games.appId, wishlistItems.appId))
      .where(eq(wishlistItems.userId, userId))
      .orderBy(asc(wishlistItems.position)),
    getItemCollections(userId),
  ]);
  return rows.map(({ wishlist_items: item, games: game }) => ({
    id: item.id,
    position: item.position,
    durationHours: item.durationHours,
    notes: item.notes,
    addedAt: item.addedAt,
    collectionIds: itemCollections.get(item.id) ?? [],
    game,
  }));
}

/** Upserts store data into the shared games cache. */
async function saveItems(items: StoreItem[]) {
  if (!items.length) return;
  const now = new Date();
  const [first, ...rest] = items.map((item) => {
    const values = { ...item, updatedAt: now };
    return db.insert(games).values(values).onConflictDoUpdate({ target: games.appId, set: values });
  });
  await db.batch([first, ...rest]);
}

/**
 * Makes sure the given games exist in the shared cache, only asking Steam for the ones
 * that are missing or older than `maxAgeMs`. Returns the IDs that exist afterwards.
 */
export async function ensureGames(appIds: number[], maxAgeMs: number): Promise<Set<number>> {
  if (!appIds.length) return new Set();
  const cached = await db
    .select({ appId: games.appId, updatedAt: games.updatedAt })
    .from(games)
    .where(inArray(games.appId, appIds));
  const freshAfter = Date.now() - maxAgeMs;
  const fresh = new Set(cached.filter((g) => (g.updatedAt?.getTime() ?? 0) > freshAfter).map((g) => g.appId));
  const toFetch = appIds.filter((id) => !fresh.has(id));
  if (toFetch.length) {
    try {
      await saveItems(await fetchItems(toFetch));
    } catch (e) {
      // If Steam is throttling us, games already cached (even if stale) are still usable.
      if (!(e instanceof SteamUnavailableError) || cached.length === 0) throw e;
    }
  }
  const existing = await db.select({ appId: games.appId }).from(games).where(inArray(games.appId, appIds));
  return new Set(existing.map((g) => g.appId));
}

/** Cached store data for the given games (no Steam calls). */
export async function getCachedGames(appIds: number[]): Promise<Game[]> {
  if (!appIds.length) return [];
  return db.select().from(games).where(inArray(games.appId, appIds));
}

export type AddResult = { added: number; skipped: number; overLimit: number; notFound: number };

/** Appends games to the end of a user's list, in the given order, respecting the list limit. */
export async function addGames(userId: string, appIds: number[]): Promise<AddResult> {
  const ids = [...new Set(appIds)];
  const inList = new Set(
    (
      await db
        .select({ appId: wishlistItems.appId })
        .from(wishlistItems)
        .where(and(eq(wishlistItems.userId, userId), inArray(wishlistItems.appId, ids)))
    ).map((r) => r.appId),
  );
  const candidates = ids.filter((id) => !inList.has(id));
  const [{ total }] = await db.select({ total: count() }).from(wishlistItems).where(eq(wishlistItems.userId, userId));
  const room = Math.max(0, MAX_ITEMS_PER_LIST - total);
  const toAdd = candidates.slice(0, room);

  const existing = await ensureGames(toAdd, FRESH_FOR_IMPORT_MS);
  const valid = toAdd.filter((id) => existing.has(id));
  if (valid.length) {
    const [{ last }] = await db
      .select({ last: max(wishlistItems.position) })
      .from(wishlistItems)
      .where(eq(wishlistItems.userId, userId));
    const start = (last ?? 0) + 1;
    await db
      .insert(wishlistItems)
      .values(valid.map((appId, i) => ({ userId, appId, position: start + i })))
      .onConflictDoNothing();
  }
  return {
    added: valid.length,
    skipped: inList.size,
    overLimit: candidates.length - toAdd.length,
    notFound: toAdd.length - valid.length,
  };
}

export async function importSteamWishlist(userId: string, steamId: string): Promise<AddResult & { found: number }> {
  const appIds = await fetchWishlist(steamId);
  if (!appIds.length) return { found: 0, added: 0, skipped: 0, overLimit: 0, notFound: 0 };
  return { found: appIds.length, ...(await addGames(userId, appIds)) };
}

const ownItem = (userId: string, id: number) => and(eq(wishlistItems.id, id), eq(wishlistItems.userId, userId));

export async function removeItem(userId: string, id: number) {
  const item = await db.query.wishlistItems.findFirst({ where: ownItem(userId, id) });
  if (!item) return;
  await db.batch([
    db.delete(collectionItems).where(eq(collectionItems.itemId, id)),
    db.delete(wishlistItems).where(eq(wishlistItems.id, id)),
  ]);
}

/** Puts back an item the user just removed, with its old position, duration and notes. */
export async function restoreItem(
  userId: string,
  data: { appId: number; position: number; durationHours: number | null; notes: string | null; addedAt: Date },
  collectionIds: number[] = [],
) {
  const [{ total }] = await db.select({ total: count() }).from(wishlistItems).where(eq(wishlistItems.userId, userId));
  if (total >= MAX_ITEMS_PER_LIST) throw new UserError(`Sua lista já tem ${MAX_ITEMS_PER_LIST} jogos.`);
  // The game may have been dropped from the cache in the meantime.
  if (!(await ensureGames([data.appId], FRESH_FOR_IMPORT_MS)).has(data.appId)) {
    throw new UserError("Esse jogo não foi encontrado na Steam.");
  }
  const [restored] = await db
    .insert(wishlistItems)
    .values({ userId, ...data })
    .onConflictDoNothing()
    .returning({ id: wishlistItems.id });
  if (restored) await linkItem(userId, restored.id, collectionIds);
}

export async function updateItem(
  userId: string,
  id: number,
  data: { durationHours: number | null; notes: string | null },
) {
  await db.update(wishlistItems).set(data).where(ownItem(userId, id));
}

/** Places an item between two neighbours of the same list (either can be null for the start/end). */
export async function moveItem(userId: string, id: number, prevId: number | null, nextId: number | null) {
  const ids = [id, prevId, nextId].filter((x): x is number => x != null);
  const rows = await db
    .select()
    .from(wishlistItems)
    .where(and(eq(wishlistItems.userId, userId), inArray(wishlistItems.id, ids)));
  if (!rows.some((r) => r.id === id)) return;
  const prev = rows.find((n) => n.id === prevId)?.position;
  const next = rows.find((n) => n.id === nextId)?.position;

  let position: number;
  if (prev != null && next != null) position = (prev + next) / 2;
  else if (prev != null) position = prev + 1;
  else if (next != null) position = next - 1;
  else return;

  await db.update(wishlistItems).set({ position }).where(ownItem(userId, id));

  // After many moves the gap between neighbours gets tiny; renumber the whole list.
  if (prev != null && next != null && next - prev < 1e-6) await renumberPositions(userId);
}

export async function moveItemToTop(userId: string, id: number) {
  const [{ first }] = await db
    .select({ first: min(wishlistItems.position) })
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, userId));
  await db.update(wishlistItems).set({ position: (first ?? 0) - 1 }).where(ownItem(userId, id));
}

async function renumberPositions(userId: string) {
  const rows = await db
    .select({ id: wishlistItems.id })
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, userId))
    .orderBy(asc(wishlistItems.position));
  if (!rows.length) return;
  const [first, ...rest] = rows.map((r, i) =>
    db.update(wishlistItems).set({ position: i + 1 }).where(eq(wishlistItems.id, r.id)),
  );
  await db.batch([first, ...rest]);
}

/** Refreshes one game of the user's list, unless its data is very recent. */
export async function refreshItem(userId: string, id: number) {
  const item = await db.query.wishlistItems.findFirst({ where: ownItem(userId, id) });
  if (!item) throw new UserError("Jogo não encontrado na sua lista.");
  await ensureGames([item.appId], FRESH_FOR_MANUAL_REFRESH_MS);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Daily job: refreshes games used by any list, oldest data first, in batches of 100 with a
 * pause between them, stopping before `deadline`. Leftovers are picked up the next day.
 */
export async function refreshForCron(deadline: number) {
  // Drop cached games that no list uses anymore.
  await db.delete(games).where(
    notInArray(games.appId, db.select({ appId: wishlistItems.appId }).from(wishlistItems)),
  );
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  await pruneRateLimits();

  const pending = await db
    .select({ appId: games.appId })
    .from(games)
    .where(or(isNull(games.updatedAt), lt(games.updatedAt, new Date(Date.now() - 12 * 3600_000))))
    .orderBy(sql`${games.updatedAt} is not null`, asc(games.updatedAt));

  let refreshed = 0;
  let stoppedBy: "done" | "deadline" | "steam" = "done";
  for (let i = 0; i < pending.length; i += 100) {
    if (Date.now() > deadline) {
      stoppedBy = "deadline";
      break;
    }
    try {
      const items = await fetchItems(pending.slice(i, i + 100).map((g) => g.appId));
      await saveItems(items);
      refreshed += items.length;
    } catch (e) {
      if (e instanceof SteamUnavailableError) {
        stoppedBy = "steam";
        break;
      }
      throw e;
    }
    await sleep(1000);
  }
  return { pending: pending.length, refreshed, stoppedBy };
}
