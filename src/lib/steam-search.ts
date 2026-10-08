import "server-only";
import { unstable_cache } from "next/cache";
import { searchStore } from "./steam";

const cached = unstable_cache(searchStore, ["steam-search"], { revalidate: 3600 });

/** Steam store search, cached for an hour per term and shared across server instances. */
export function cachedSearch(term: string) {
  return cached(term.trim().toLowerCase().replace(/\s+/g, " "));
}
