import "server-only";
import { pickMatch, type MatchStatus } from "./game-match";
import type { SearchResult } from "./steam";
import { cachedSearch } from "./steam-search";
import { ensureGames, getCachedGames } from "./wishlist";

export type ResolvedLine = {
  query: string;
  status: MatchStatus | "error";
  match: SearchResult | null;
  alternatives: SearchResult[];
};

const DAY_MS = 24 * 3600_000;
const SEARCH_CONCURRENCY = 2;

/** A line that is a store link or a bare app ID, instead of a name to search. */
export function appIdFromLine(line: string): number | null {
  const link = line.match(/store\.steampowered\.com\/app\/(\d+)/);
  if (link) return Number(link[1]);
  return /^\d{2,8}$/.test(line.trim()) ? Number(line.trim()) : null;
}

/**
 * Resolves typed names (or links/IDs) to Steam games for the bulk-add review.
 * A Steam failure only marks the affected lines as "error", so they can be retried.
 */
export async function resolveLines(lines: string[]): Promise<ResolvedLine[]> {
  const results: ResolvedLine[] = new Array(lines.length);

  const ids = lines.map(appIdFromLine);
  const idList = [...new Set(ids.filter((id): id is number => id != null))];
  let byId: Map<number, SearchResult> | null = null;
  if (idList.length) {
    try {
      await ensureGames(idList, DAY_MS);
      byId = new Map(
        (await getCachedGames(idList)).map((g) => [
          g.appId,
          {
            appId: g.appId,
            name: g.name,
            image: g.capsuleImage ?? g.headerImage ?? "",
            priceFinal: g.priceFinal,
            priceInitial: g.priceInitial,
          },
        ]),
      );
    } catch {
      byId = null;
    }
  }

  const nameIndexes: number[] = [];
  lines.forEach((query, i) => {
    const id = ids[i];
    if (id == null) return nameIndexes.push(i);
    const game = byId?.get(id) ?? null;
    results[i] = {
      query,
      status: byId == null ? "error" : game ? "exact" : "notfound",
      match: game,
      alternatives: game ? [game] : [],
    };
  });

  let next = 0;
  async function worker() {
    while (next < nameIndexes.length) {
      const i = nameIndexes[next++];
      const query = lines[i];
      try {
        results[i] = { query, ...pickMatch(query, await cachedSearch(query)) };
      } catch {
        results[i] = { query, status: "error", match: null, alternatives: [] };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(SEARCH_CONCURRENCY, nameIndexes.length) }, worker));
  return results;
}
