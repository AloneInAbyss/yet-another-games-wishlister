import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export type Genre = { id: string; description: string };

/** Cache of Steam store data, shared by every list that contains the game. */
export const games = sqliteTable("games", {
  appId: integer("app_id").primaryKey(),
  name: text("name").notNull(),
  type: text("type"),
  headerImage: text("header_image"),
  capsuleImage: text("capsule_image"),
  shortDescription: text("short_description"),
  genres: text("genres", { mode: "json" }).$type<Genre[]>().notNull().default([]),
  isEarlyAccess: integer("is_early_access", { mode: "boolean" }).notNull().default(false),
  isFree: integer("is_free", { mode: "boolean" }).notNull().default(false),
  // False when the game cannot be bought in the Brazilian store.
  availableInRegion: integer("available_in_region", { mode: "boolean" }).notNull().default(true),
  currency: text("currency"),
  // Prices are in cents (e.g. 1849 = R$ 18,49). Null when there is no price yet.
  priceInitial: integer("price_initial"),
  priceFinal: integer("price_final"),
  discountPercent: integer("discount_percent").notNull().default(0),
  lowestPriceSeen: integer("lowest_price_seen"),
  comingSoon: integer("coming_soon", { mode: "boolean" }).notNull().default(false),
  releaseDateText: text("release_date_text"),
  // ISO date (yyyy-mm-dd) parsed from releaseDateText, used for sorting.
  releaseDate: text("release_date"),
  reviewScore: integer("review_score"),
  reviewPositive: integer("review_positive"),
  reviewTotal: integer("review_total"),
  detailsUpdatedAt: integer("details_updated_at", { mode: "timestamp" }),
  priceUpdatedAt: integer("price_updated_at", { mode: "timestamp" }),
});

/** Personal entries of the wishlist. */
export const wishlistItems = sqliteTable(
  "wishlist_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    appId: integer("app_id")
      .notNull()
      .unique()
      .references(() => games.appId, { onDelete: "cascade" }),
    // Lower position = higher priority. Real numbers allow inserting between two items.
    position: real("position").notNull(),
    durationHours: real("duration_hours"),
    notes: text("notes"),
    addedAt: integer("added_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("wishlist_items_position_idx").on(t.position)],
);

export const priceHistory = sqliteTable(
  "price_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    appId: integer("app_id")
      .notNull()
      .references(() => games.appId, { onDelete: "cascade" }),
    priceFinal: integer("price_final").notNull(),
    discountPercent: integer("discount_percent").notNull(),
    recordedAt: integer("recorded_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("price_history_app_idx").on(t.appId, t.recordedAt)],
);

export type Game = typeof games.$inferSelect;
export type WishlistItem = typeof wishlistItems.$inferSelect;
