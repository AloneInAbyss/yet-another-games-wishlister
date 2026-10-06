/**
 * One-off migration from the single-owner schema to the multi-user one.
 *
 * Keeps the owner's list (order, durations, notes, price history), assigns it to a new
 * user linked to OWNER_STEAM_ID and reloads every game in the new format (tags, reviews).
 *
 * Usage (make a backup first!):
 *   OWNER_STEAM_ID=7656119... OWNER_USERNAME=meunome CONFIRM=1 \
 *     DATABASE_URL=... DATABASE_AUTH_TOKEN=... \
 *     npx tsx --conditions=react-server scripts/migrate-to-multiuser.mts
 */
import { randomBytes } from "node:crypto";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const url = process.env.DATABASE_URL ?? "file:local.db";
const ownerSteamId = process.env.OWNER_STEAM_ID ?? "";
const ownerUsername = (process.env.OWNER_USERNAME ?? "").toLowerCase();

if (!/^7656119\d{10}$/.test(ownerSteamId)) throw new Error("Defina OWNER_STEAM_ID (SteamID64 com 17 dígitos)");
if (!/^[a-z0-9_-]{3,20}$/.test(ownerUsername)) throw new Error("Defina OWNER_USERNAME (3-20: a-z, 0-9, _ e -)");
if (process.env.CONFIRM !== "1") {
  console.log(`Banco alvo: ${url}\nNada foi alterado. Rode de novo com CONFIRM=1 para migrar.`);
  process.exit(0);
}

const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
const columns = (await client.execute("PRAGMA table_info(wishlist_items)")).rows.map((r) => r.name);
if (columns.length === 0 || columns.includes("user_id")) {
  console.log("O banco não está no formato antigo; nada a fazer.");
  process.exit(0);
}

type Row = Record<string, unknown>;
const rows = async (q: string) => (await client.execute(q)).rows as unknown as Row[];
const oldItems = await rows("select app_id, position, duration_hours, notes, added_at from wishlist_items order by position");
const oldGames = await rows("select app_id, name, capsule_image, header_image, lowest_price_seen from games");
const oldHistory = await rows("select app_id, price_final, discount_percent, recorded_at from price_history");
console.log(`Encontrados: ${oldItems.length} itens, ${oldGames.length} jogos, ${oldHistory.length} registros de preço.`);

// 1. Move the old tables out of the way (their index names clash with the new ones).
await client.batch(
  [
    "drop index if exists wishlist_items_position_idx",
    "drop index if exists price_history_app_idx",
    "alter table wishlist_items rename to old_wishlist_items",
    "alter table price_history rename to old_price_history",
    "alter table games rename to old_games",
  ],
  "write",
);

// 2. Create the new schema.
await migrate(drizzle(client), { migrationsFolder: "drizzle" });
console.log("Esquema novo criado.");

// 3. Reload games in the new format. Imported here so the app's DB client sees the new tables.
const { ensureGames } = await import("../src/lib/wishlist");
const { fetchSteamProfile } = await import("../src/lib/steam");
const appIds = oldItems.map((r) => Number(r.app_id));
// If Steam fails here, keep going with the old basic data; the daily cron fills in the rest.
const fetched = await ensureGames(appIds, 0).catch((e) => {
  console.warn("Falha ao consultar a Steam, usando os dados antigos:", e);
  return new Set<number>();
});
console.log(`${fetched.size} de ${appIds.length} jogos recarregados da Steam.`);

const profile = await fetchSteamProfile({ kind: "id", value: ownerSteamId }).catch(() => null);
const userId = randomBytes(16).toString("base64url");

const statements: { sql: string; args: (string | number | null)[] }[] = [
  {
    sql: "insert into users (id, username, display_name, avatar_url) values (?, ?, ?, ?)",
    args: [userId, ownerUsername, profile?.name ?? ownerUsername, profile?.avatarUrl ?? null],
  },
  {
    sql: "insert into accounts (user_id, provider, provider_account_id) values (?, 'steam', ?)",
    args: [userId, ownerSteamId],
  },
];
for (const g of oldGames) {
  if (!fetched.has(Number(g.app_id))) {
    // Delisted on Steam: keep the old basic data so the item is not lost.
    statements.push({
      sql: "insert into games (app_id, name, capsule_image, header_image) values (?, ?, ?, ?)",
      args: [Number(g.app_id), String(g.name), (g.capsule_image as string) ?? null, (g.header_image as string) ?? null],
    });
  }
  if (g.lowest_price_seen != null) {
    statements.push({
      sql: "update games set lowest_price_seen = min(coalesce(lowest_price_seen, ?), ?) where app_id = ?",
      args: [Number(g.lowest_price_seen), Number(g.lowest_price_seen), Number(g.app_id)],
    });
  }
}
for (const i of oldItems) {
  statements.push({
    sql: "insert into wishlist_items (user_id, app_id, position, duration_hours, notes, added_at) values (?, ?, ?, ?, ?, ?)",
    args: [
      userId,
      Number(i.app_id),
      Number(i.position),
      i.duration_hours == null ? null : Number(i.duration_hours),
      (i.notes as string) ?? null,
      Number(i.added_at),
    ],
  });
}
for (const h of oldHistory) {
  statements.push({
    sql: "insert into price_history (app_id, price_final, discount_percent, recorded_at) select ?, ?, ?, ? where exists (select 1 from games where app_id = ?)",
    args: [Number(h.app_id), Number(h.price_final), Number(h.discount_percent), Number(h.recorded_at), Number(h.app_id)],
  });
}
statements.push(
  { sql: "drop table old_wishlist_items", args: [] },
  { sql: "drop table old_price_history", args: [] },
  { sql: "drop table old_games", args: [] },
);

// 4. Everything else in a single transaction.
await client.batch(statements, "write");
const [{ n }] = (await client.execute("select count(*) as n from wishlist_items")).rows as unknown as { n: number }[];
console.log(`Pronto: ${n} itens agora pertencem a /u/${ownerUsername}.`);
client.close();
process.exit(0);
