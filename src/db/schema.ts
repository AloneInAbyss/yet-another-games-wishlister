import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export type Tag = { id: number; name: string };

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  // Chosen during onboarding; null until then.
  username: text("username").unique(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  listPublic: integer("list_public", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/** Login providers linked to a user (Steam; "dev" only exists in local tests). */
export const accounts = sqliteTable(
  "accounts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["steam", "dev"] }).notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("accounts_provider_account_idx").on(t.provider, t.providerAccountId),
    uniqueIndex("accounts_user_provider_idx").on(t.userId, t.provider),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    // SHA-256 of the token stored in the cookie; the token itself is never stored.
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** Cache of Steam store data, shared by every list that contains the game. */
export const games = sqliteTable("games", {
  appId: integer("app_id").primaryKey(),
  name: text("name").notNull(),
  capsuleImage: text("capsule_image"),
  headerImage: text("header_image"),
  // The most relevant Steam user tags, already translated.
  tags: text("tags", { mode: "json" }).$type<Tag[]>().notNull().default([]),
  isEarlyAccess: integer("is_early_access", { mode: "boolean" }).notNull().default(false),
  isFree: integer("is_free", { mode: "boolean" }).notNull().default(false),
  // Prices are in cents (e.g. 1849 = R$ 18,49). Null when there is no price.
  priceInitial: integer("price_initial"),
  priceFinal: integer("price_final"),
  discountPercent: integer("discount_percent").notNull().default(0),
  comingSoon: integer("coming_soon", { mode: "boolean" }).notNull().default(false),
  releaseDateText: text("release_date_text"),
  // ISO date (yyyy-mm-dd), used for sorting. Vague dates resolve to the start of their period.
  releaseDate: text("release_date"),
  reviewScore: integer("review_score"),
  reviewPercent: integer("review_percent"),
  reviewTotal: integer("review_total"),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const wishlistItems = sqliteTable(
  "wishlist_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    appId: integer("app_id")
      .notNull()
      .references(() => games.appId, { onDelete: "cascade" }),
    // Lower position = higher priority. Real numbers allow inserting between two items.
    position: real("position").notNull(),
    durationHours: real("duration_hours"),
    notes: text("notes"),
    addedAt: integer("added_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("wishlist_items_user_app_idx").on(t.userId, t.appId),
    index("wishlist_items_user_position_idx").on(t.userId, t.position),
  ],
);

/** Names of Steam tags in Portuguese, refreshed when an unknown tag shows up. */
export const steamTags = sqliteTable("steam_tags", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
});

/** Fixed-window counters shared by every server instance. resetAt is a unix timestamp in seconds. */
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: integer("reset_at").notNull(),
});

/** Small key/value store for global flags (e.g. the Steam circuit breaker). */
export const appState = sqliteTable("app_state", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type User = typeof users.$inferSelect;
export type Game = typeof games.$inferSelect;
export type WishlistItem = typeof wishlistItems.$inferSelect;
