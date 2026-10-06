import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appState } from "@/db/schema";
import { SteamUnavailableError } from "./errors";
import { consume, type RuleName } from "./rate-limit";

const COOLDOWN_KEY = "steam_cooldown_until";
const COOLDOWN_SECONDS = 300;
const RETRY_DELAYS_MS = [1000, 3000];
const TIMEOUT_MS = 15_000;

const BUDGETS: Record<string, RuleName> = {
  "store.steampowered.com": "steamStore",
  "api.steampowered.com": "steamApi",
  "steamcommunity.com": "steamCommunity",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function cooldownUntil(): Promise<number> {
  const row = await db.query.appState.findFirst({ where: eq(appState.key, COOLDOWN_KEY) });
  return row ? Number(row.value) : 0;
}

async function startCooldown() {
  const until = String(Math.floor(Date.now() / 1000) + COOLDOWN_SECONDS);
  await db
    .insert(appState)
    .values({ key: COOLDOWN_KEY, value: until })
    .onConflictDoUpdate({ target: appState.key, set: { value: until } });
}

export async function isSteamCoolingDown(): Promise<boolean> {
  return (await cooldownUntil()) > Date.now() / 1000;
}

function isThrottle(status: number) {
  return status === 429 || status === 403 || status >= 500;
}

/**
 * Every request to Steam goes through here. It enforces our own request budget per host,
 * retries throttling responses with backoff and, if Steam keeps refusing, opens a circuit
 * breaker that blocks all Steam calls for a few minutes.
 */
export async function steamFetch(url: string, init?: RequestInit): Promise<Response> {
  if (await isSteamCoolingDown()) throw new SteamUnavailableError();

  const budget = BUDGETS[new URL(url).hostname];
  if (!budget) throw new Error(`Host da Steam desconhecido: ${url}`);
  if (!(await consume(budget, "global")).ok) throw new SteamUnavailableError();

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: { "Accept-Language": "pt-BR,pt;q=0.9", ...init?.headers },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!isThrottle(res.status)) return res;
    if (attempt >= RETRY_DELAYS_MS.length) {
      await startCooldown();
      throw new SteamUnavailableError();
    }
    await sleep(RETRY_DELAYS_MS[attempt]);
  }
}

export async function steamJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await steamFetch(url, init);
  if (!res.ok) throw new Error(`Steam respondeu ${res.status} para ${url}`);
  return (await res.json()) as T;
}
