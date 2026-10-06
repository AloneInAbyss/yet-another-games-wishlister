import "server-only";
import { asc, eq, inArray, isNull, max, min, sql } from "drizzle-orm";
import { db } from "@/db";
import { games, priceHistory, wishlistItems, type Game } from "@/db/schema";
import {
  fetchAppDetails,
  fetchPrices,
  fetchReviews,
  type AppDetails,
  type PriceInfo,
  type ReviewSummary,
} from "./steam";

export type WishlistEntry = {
  id: number;
  position: number;
  durationHours: number | null;
  notes: string | null;
  addedAt: Date;
  game: Game;
};

export async function getWishlist(): Promise<WishlistEntry[]> {
  const rows = await db
    .select()
    .from(wishlistItems)
    .innerJoin(games, eq(games.appId, wishlistItems.appId))
    .orderBy(asc(wishlistItems.position));
  return rows.map(({ wishlist_items: item, games: game }) => ({
    id: item.id,
    position: item.position,
    durationHours: item.durationHours,
    notes: item.notes,
    addedAt: item.addedAt,
    game,
  }));
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Builds the statements that store a new price and keep the price history / lowest price up to date. */
function priceStatements(appId: number, price: PriceInfo, previous: Pick<Game, "priceFinal" | "lowestPriceSeen"> | undefined) {
  const now = new Date();
  const lowest =
    price.priceFinal == null
      ? (previous?.lowestPriceSeen ?? null)
      : Math.min(price.priceFinal, previous?.lowestPriceSeen ?? Infinity);
  const update = db
    .update(games)
    .set({ ...price, lowestPriceSeen: lowest, priceUpdatedAt: now })
    .where(eq(games.appId, appId));
  const changed = price.priceFinal != null && price.priceFinal !== previous?.priceFinal;
  const history = changed
    ? db.insert(priceHistory).values({
        appId,
        priceFinal: price.priceFinal!,
        discountPercent: price.discountPercent,
        recordedAt: now,
      })
    : null;
  return history ? [update, history] : [update];
}

async function saveGame(details: AppDetails, reviews: ReviewSummary | null) {
  const previous = await db.query.games.findFirst({ where: eq(games.appId, details.appId) });
  const { currency, priceInitial, priceFinal, discountPercent, ...info } = details;
  const values = { ...info, ...(reviews ?? {}), detailsUpdatedAt: new Date() };
  await db
    .insert(games)
    .values({ ...values, discountPercent: 0 })
    .onConflictDoUpdate({ target: games.appId, set: values });
  const [first, ...rest] = priceStatements(
    details.appId,
    { currency, priceInitial, priceFinal, discountPercent },
    previous,
  );
  await db.batch([first, ...rest]);
}

async function fetchAndSaveGame(appId: number): Promise<boolean> {
  const details = await fetchAppDetails(appId);
  if (!details) return false;
  const reviews = await fetchReviews(appId).catch(() => null);
  await saveGame(details, reviews);
  return true;
}

export type AddResult = { added: number; skipped: number; failed: number[] };

export async function addGames(appIds: number[]): Promise<AddResult> {
  const existing = appIds.length
    ? await db.select({ appId: wishlistItems.appId }).from(wishlistItems).where(inArray(wishlistItems.appId, appIds))
    : [];
  const existingIds = new Set(existing.map((e) => e.appId));
  const toAdd = [...new Set(appIds)].filter((id) => !existingIds.has(id));

  const ok = await mapLimit(toAdd, 3, (id) => fetchAndSaveGame(id).catch(() => false));
  const added = toAdd.filter((_, i) => ok[i]);

  if (added.length) {
    const [{ last }] = await db.select({ last: max(wishlistItems.position) }).from(wishlistItems);
    const start = (last ?? 0) + 1;
    await db.insert(wishlistItems).values(added.map((appId, i) => ({ appId, position: start + i })));
  }
  return {
    added: added.length,
    skipped: appIds.length - toAdd.length,
    failed: toAdd.filter((_, i) => !ok[i]),
  };
}

export async function removeItem(id: number) {
  await db.delete(wishlistItems).where(eq(wishlistItems.id, id));
  // Drop cached games that no list references anymore.
  await db.delete(games).where(
    sql`${games.appId} not in (select ${wishlistItems.appId} from ${wishlistItems})`,
  );
}

export async function updateItem(id: number, data: { durationHours: number | null; notes: string | null }) {
  await db.update(wishlistItems).set(data).where(eq(wishlistItems.id, id));
}

/** Places an item between two neighbours (either can be null for the start/end of the list). */
export async function moveItem(id: number, prevId: number | null, nextId: number | null) {
  const ids = [prevId, nextId].filter((x): x is number => x != null);
  const neighbours = ids.length
    ? await db.select().from(wishlistItems).where(inArray(wishlistItems.id, ids))
    : [];
  const prev = neighbours.find((n) => n.id === prevId)?.position;
  const next = neighbours.find((n) => n.id === nextId)?.position;

  let position: number;
  if (prev != null && next != null) position = (prev + next) / 2;
  else if (prev != null) position = prev + 1;
  else if (next != null) position = next - 1;
  else return;

  await db.update(wishlistItems).set({ position }).where(eq(wishlistItems.id, id));

  // After many moves the gap between neighbours gets tiny; renumber everything.
  if (prev != null && next != null && next - prev < 1e-6) await renumberPositions();
}

export async function moveItemToTop(id: number) {
  const [{ first }] = await db.select({ first: min(wishlistItems.position) }).from(wishlistItems);
  await db.update(wishlistItems).set({ position: (first ?? 0) - 1 }).where(eq(wishlistItems.id, id));
}

async function renumberPositions() {
  const rows = await db.select({ id: wishlistItems.id }).from(wishlistItems).orderBy(asc(wishlistItems.position));
  if (!rows.length) return;
  const [first, ...rest] = rows.map((r, i) =>
    db.update(wishlistItems).set({ position: i + 1 }).where(eq(wishlistItems.id, r.id)),
  );
  await db.batch([first, ...rest]);
}

/** Updates the price of every game in a few batched requests. */
export async function refreshAllPrices(): Promise<number> {
  const rows = await db.select().from(games);
  if (!rows.length) return 0;
  const prices = await fetchPrices(rows.map((r) => r.appId));
  const statements = rows.flatMap((g) => {
    const price = prices.get(g.appId);
    return price && g.availableInRegion ? priceStatements(g.appId, price, g) : [];
  });
  if (statements.length) {
    const [first, ...rest] = statements;
    await db.batch([first, ...rest]);
  }
  return prices.size;
}

/**
 * Refreshes the full details (release date, early access, genres, reviews) of the
 * games updated longest ago. Each game costs two Steam requests, so this is capped.
 */
export async function refreshStaleDetails(limit: number): Promise<number> {
  const rows = await db
    .select({ appId: games.appId })
    .from(games)
    .orderBy(sql`${isNull(games.detailsUpdatedAt)} desc`, asc(games.detailsUpdatedAt))
    .limit(limit);
  const ok = await mapLimit(rows, 3, (r) => fetchAndSaveGame(r.appId).catch(() => false));
  return ok.filter(Boolean).length;
}

export async function refreshGame(appId: number): Promise<boolean> {
  return fetchAndSaveGame(appId);
}
