import "server-only";
import { and, asc, count, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { collectionItems, collections, wishlistItems } from "@/db/schema";
import { MAX_COLLECTIONS, nextColor, type CollectionColor, type CollectionInfo } from "./collections";
import { UserError } from "./errors";

const ownCollection = (userId: string, id: number) => and(eq(collections.id, id), eq(collections.userId, userId));

export async function getCollections(userId: string): Promise<CollectionInfo[]> {
  const rows = await db
    .select({
      id: collections.id,
      name: collections.name,
      color: collections.color,
      count: count(collectionItems.itemId),
    })
    .from(collections)
    .leftJoin(collectionItems, eq(collectionItems.collectionId, collections.id))
    .where(eq(collections.userId, userId))
    .groupBy(collections.id)
    .orderBy(asc(sql`${collections.name} collate nocase`));
  return rows.map((r) => ({ ...r, color: r.color as CollectionColor }));
}

/** Collection IDs of each item in a user's list. */
export async function getItemCollections(userId: string): Promise<Map<number, number[]>> {
  const rows = await db
    .select({ itemId: collectionItems.itemId, collectionId: collectionItems.collectionId })
    .from(collectionItems)
    .innerJoin(wishlistItems, eq(wishlistItems.id, collectionItems.itemId))
    .where(eq(wishlistItems.userId, userId));
  const map = new Map<number, number[]>();
  for (const r of rows) map.set(r.itemId, [...(map.get(r.itemId) ?? []), r.collectionId]);
  return map;
}

async function assertNameFree(userId: string, name: string, exceptId?: number) {
  const clash = await db.query.collections.findFirst({
    where: and(
      eq(collections.userId, userId),
      sql`lower(${collections.name}) = lower(${name})`,
      exceptId != null ? ne(collections.id, exceptId) : undefined,
    ),
  });
  if (clash) throw new UserError(`Você já tem uma coleção chamada "${clash.name}".`);
}

export async function createCollection(userId: string, name: string, color?: CollectionColor): Promise<CollectionInfo> {
  const existing = await db
    .select({ color: collections.color })
    .from(collections)
    .where(eq(collections.userId, userId));
  if (existing.length >= MAX_COLLECTIONS) throw new UserError(`Você pode ter até ${MAX_COLLECTIONS} coleções.`);
  await assertNameFree(userId, name);
  const [row] = await db
    .insert(collections)
    .values({ userId, name, color: color ?? nextColor(existing.map((c) => c.color)) })
    .returning();
  return { id: row.id, name: row.name, color: row.color as CollectionColor, count: 0 };
}

export async function updateCollection(userId: string, id: number, data: { name?: string; color?: CollectionColor }) {
  if (data.name != null) await assertNameFree(userId, data.name, id);
  const updated = await db
    .update(collections)
    .set(data)
    .where(ownCollection(userId, id))
    .returning({ id: collections.id });
  if (!updated.length) throw new UserError("Coleção não encontrada.");
}

export async function deleteCollection(userId: string, id: number) {
  const own = await db.query.collections.findFirst({ where: ownCollection(userId, id) });
  if (!own) throw new UserError("Coleção não encontrada.");
  // Explicit deletes: SQLite only cascades when foreign keys are enforced on the connection.
  await db.batch([
    db.delete(collectionItems).where(eq(collectionItems.collectionId, id)),
    db.delete(collections).where(eq(collections.id, id)),
  ]);
}

/** Adds or removes one game of the user's list to/from one of their collections. */
export async function setItemInCollection(userId: string, itemId: number, collectionId: number, member: boolean) {
  const [item, collection] = await Promise.all([
    db.query.wishlistItems.findFirst({ where: and(eq(wishlistItems.id, itemId), eq(wishlistItems.userId, userId)) }),
    db.query.collections.findFirst({ where: ownCollection(userId, collectionId) }),
  ]);
  if (!item || !collection) throw new UserError("Jogo ou coleção não encontrados.");
  if (member) await db.insert(collectionItems).values({ collectionId, itemId }).onConflictDoNothing();
  else
    await db
      .delete(collectionItems)
      .where(and(eq(collectionItems.collectionId, collectionId), eq(collectionItems.itemId, itemId)));
}

/** Puts an item back in collections (used when restoring a removed game). Ignores IDs that aren't the user's. */
export async function linkItem(userId: string, itemId: number, collectionIds: number[]) {
  if (!collectionIds.length) return;
  const owned = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.userId, userId), inArray(collections.id, collectionIds)));
  if (!owned.length) return;
  await db
    .insert(collectionItems)
    .values(owned.map((c) => ({ collectionId: c.id, itemId })))
    .onConflictDoNothing();
}
