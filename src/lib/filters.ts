import type { WishlistEntry } from "./wishlist";

export const SORTS = {
  priority: { label: "Prioridade", defaultDir: "asc" },
  price: { label: "Preço", defaultDir: "asc" },
  discount: { label: "% de desconto", defaultDir: "desc" },
  duration: { label: "Duração", defaultDir: "asc" },
  reviews: { label: "Avaliações positivas", defaultDir: "desc" },
  release: { label: "Data de lançamento", defaultDir: "desc" },
  name: { label: "Nome", defaultDir: "asc" },
  added: { label: "Adicionado em", defaultDir: "desc" },
} as const;

export type SortKey = keyof typeof SORTS;
export type SortDir = "asc" | "desc";
export type TriState = "any" | "only" | "exclude";
export type ReleaseFilter = "any" | "released" | "upcoming";
export type TagMode = "all" | "any";

export type Filters = {
  q: string;
  priceMin: string;
  priceMax: string;
  tags: string[];
  tagMode: TagMode;
  collections: number[];
  collectionMode: TagMode;
  minReview: string;
  earlyAccess: TriState;
  onSale: boolean;
  release: ReleaseFilter;
  sort: SortKey;
  dir: SortDir;
};

export const DEFAULT_FILTERS: Filters = {
  q: "",
  priceMin: "",
  priceMax: "",
  tags: [],
  tagMode: "all",
  collections: [],
  collectionMode: "all",
  minReview: "",
  earlyAccess: "any",
  onSale: false,
  release: "any",
  sort: "priority",
  dir: "asc",
};

const toNumber = (s: string) => {
  const n = Number(s.replace(",", "."));
  return s.trim() !== "" && Number.isFinite(n) ? n : null;
};

/** The price used for filtering/sorting, in cents. Free games count as zero. */
function effectivePrice(e: WishlistEntry): number | null {
  return e.game.isFree ? 0 : e.game.priceFinal;
}

export function applyFilters(entries: WishlistEntry[], f: Filters): WishlistEntry[] {
  const q = f.q.trim().toLowerCase();
  const min = toNumber(f.priceMin);
  const max = toNumber(f.priceMax);
  const minReview = toNumber(f.minReview);

  const filtered = entries.filter((e) => {
    const g = e.game;
    if (q && !g.name.toLowerCase().includes(q)) return false;
    if (min != null || max != null) {
      const price = effectivePrice(e);
      if (price == null) return false;
      if (min != null && price < min * 100) return false;
      if (max != null && price > max * 100) return false;
    }
    if (f.tags.length) {
      const names = new Set(g.tags.map((t) => t.name));
      const matches = f.tagMode === "all" ? f.tags.every((t) => names.has(t)) : f.tags.some((t) => names.has(t));
      if (!matches) return false;
    }
    if (f.collections.length) {
      const ids = new Set(e.collectionIds);
      const inCollections =
        f.collectionMode === "all" ? f.collections.every((c) => ids.has(c)) : f.collections.some((c) => ids.has(c));
      if (!inCollections) return false;
    }
    if (minReview != null && (g.reviewPercent == null || g.reviewPercent < minReview)) return false;
    if (f.earlyAccess === "only" && !g.isEarlyAccess) return false;
    if (f.earlyAccess === "exclude" && g.isEarlyAccess) return false;
    if (f.onSale && g.discountPercent <= 0) return false;
    if (f.release === "released" && g.comingSoon) return false;
    if (f.release === "upcoming" && !g.comingSoon) return false;
    return true;
  });

  const key = sortValue[f.sort];
  const sign = f.dir === "asc" ? 1 : -1;
  return filtered.sort((a, b) => {
    const va = key(a);
    const vb = key(b);
    // Missing values always go to the end, whatever the direction.
    if (va == null || vb == null) return va == null && vb == null ? a.position - b.position : va == null ? 1 : -1;
    const cmp = typeof va === "string" ? va.localeCompare(vb as string, "pt-BR") : va - (vb as number);
    return cmp !== 0 ? cmp * sign : a.position - b.position;
  });
}

const sortValue: Record<SortKey, (e: WishlistEntry) => number | string | null> = {
  priority: (e) => e.position,
  price: effectivePrice,
  discount: (e) => e.game.discountPercent,
  duration: (e) => e.durationHours,
  // Ties on percentage are broken by number of reviews.
  reviews: (e) => (e.game.reviewPercent == null ? null : e.game.reviewPercent * 1e9 + (e.game.reviewTotal ?? 0)),
  release: (e) => e.game.releaseDate,
  name: (e) => e.game.name,
  added: (e) => e.addedAt.getTime(),
};

export function isFiltering(f: Filters): boolean {
  return (
    f.q !== "" ||
    f.priceMin !== "" ||
    f.priceMax !== "" ||
    f.tags.length > 0 ||
    f.collections.length > 0 ||
    f.minReview !== "" ||
    f.earlyAccess !== "any" ||
    f.onSale ||
    f.release !== "any"
  );
}

export function filtersFromParams(params: Record<string, string | string[] | undefined>): Filters {
  const get = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : "");
  const sort = (get("sort") in SORTS ? get("sort") : "priority") as SortKey;
  const dir = get("dir") === "asc" || get("dir") === "desc" ? (get("dir") as SortDir) : SORTS[sort].defaultDir;
  const tri = (v: string): TriState => (v === "only" || v === "exclude" ? v : "any");
  const release = get("release");
  return {
    q: get("q"),
    priceMin: get("min"),
    priceMax: get("max"),
    tags: get("tags") ? get("tags").split("|").slice(0, 20) : [],
    tagMode: get("tm") === "any" ? "any" : "all",
    collections: get("col")
      ? get("col")
          .split("-")
          .map(Number)
          .filter((n) => Number.isInteger(n) && n > 0)
          .slice(0, 30)
      : [],
    collectionMode: get("cm") === "any" ? "any" : "all",
    minReview: get("review"),
    earlyAccess: tri(get("ea")),
    onSale: get("sale") === "1",
    release: release === "released" || release === "upcoming" ? release : "any",
    sort,
    dir,
  };
}

export function filtersToSearch(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.priceMin) p.set("min", f.priceMin);
  if (f.priceMax) p.set("max", f.priceMax);
  if (f.tags.length) p.set("tags", f.tags.join("|"));
  if (f.tagMode !== "all") p.set("tm", f.tagMode);
  if (f.collections.length) p.set("col", f.collections.join("-"));
  if (f.collectionMode !== "all") p.set("cm", f.collectionMode);
  if (f.minReview) p.set("review", f.minReview);
  if (f.earlyAccess !== "any") p.set("ea", f.earlyAccess);
  if (f.onSale) p.set("sale", "1");
  if (f.release !== "any") p.set("release", f.release);
  if (f.sort !== "priority") p.set("sort", f.sort);
  if (f.dir !== SORTS[f.sort].defaultDir) p.set("dir", f.dir);
  const s = p.toString();
  return s ? `?${s}` : "";
}
