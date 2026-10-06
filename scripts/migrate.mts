/** Applies pending migrations from ./drizzle to DATABASE_URL (default: local SQLite file). */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const url = process.env.DATABASE_URL ?? "file:local.db";
const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });

await migrate(drizzle(client), { migrationsFolder: "drizzle" });
console.log(`Migrações aplicadas em ${url.replace(/\/\/.*@/, "//***@")}`);
client.close();
