import "server-only";
import { lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";
import { RateLimitError } from "./errors";

type Rule = { limit: number; windowSeconds: number };

export const RULES = {
  search: { limit: 30, windowSeconds: 60 },
  // Names looked up by "Vários de uma vez" (links/IDs don't count).
  bulkSearch: { limit: 150, windowSeconds: 3600 },
  addGames: { limit: 100, windowSeconds: 3600 },
  importShort: { limit: 1, windowSeconds: 300 },
  importDaily: { limit: 10, windowSeconds: 86_400 },
  refreshGame: { limit: 30, windowSeconds: 3600 },
  mutate: { limit: 120, windowSeconds: 60 },
  username: { limit: 5, windowSeconds: 86_400 },
  loginIp: { limit: 20, windowSeconds: 60 },
  signupIp: { limit: 5, windowSeconds: 86_400 },
  // Self-imposed budgets for outgoing Steam requests, below the real limits.
  steamStore: { limit: 100, windowSeconds: 300 },
  steamApi: { limit: 300, windowSeconds: 300 },
  steamCommunity: { limit: 60, windowSeconds: 300 },
} satisfies Record<string, Rule>;

export type RuleName = keyof typeof RULES;

/**
 * Adds `cost` to a fixed-window counter in one atomic statement and reports whether
 * the limit still holds. Works across serverless instances because state lives in the DB.
 */
export async function consume(
  rule: RuleName,
  subject: string,
  cost = 1,
): Promise<{ ok: boolean; retryAfterSeconds: number }> {
  const { limit, windowSeconds } = RULES[rule];
  const key = `${rule}:${subject}`;
  const now = Math.floor(Date.now() / 1000);
  const row = await db.get<{ count: number; reset_at: number }>(sql`
    insert into rate_limits (key, count, reset_at) values (${key}, ${cost}, ${now + windowSeconds})
    on conflict (key) do update set
      count = case when reset_at <= ${now} then ${cost} else count + ${cost} end,
      reset_at = case when reset_at <= ${now} then ${now + windowSeconds} else reset_at end
    returning count, reset_at`);
  return { ok: row.count <= limit, retryAfterSeconds: Math.max(0, row.reset_at - now) };
}

/** Like consume(), but throws a RateLimitError (with a user-facing message) when exceeded. */
export async function enforce(rule: RuleName, subject: string, cost = 1): Promise<void> {
  const r = await consume(rule, subject, cost);
  if (!r.ok) throw new RateLimitError(r.retryAfterSeconds);
}

export async function pruneRateLimits() {
  await db.delete(rateLimits).where(lt(rateLimits.resetAt, Math.floor(Date.now() / 1000)));
}
