import type { Genre } from "@/db/schema";

const STORE = "https://store.steampowered.com";
const COUNTRY = "br";
const LANGUAGE = "brazilian";
export const EARLY_ACCESS_GENRE_ID = "70";

export type SearchResult = {
  appId: number;
  name: string;
  image: string;
  priceFinal: number | null;
  priceInitial: number | null;
};

export type AppDetails = {
  appId: number;
  name: string;
  type: string | null;
  headerImage: string | null;
  capsuleImage: string | null;
  shortDescription: string | null;
  genres: Genre[];
  isEarlyAccess: boolean;
  isFree: boolean;
  availableInRegion: boolean;
  currency: string | null;
  priceInitial: number | null;
  priceFinal: number | null;
  discountPercent: number;
  comingSoon: boolean;
  releaseDateText: string | null;
  releaseDate: string | null;
};

export type PriceInfo = {
  currency: string | null;
  priceInitial: number | null;
  priceFinal: number | null;
  discountPercent: number;
};

export type ReviewSummary = {
  reviewScore: number;
  reviewPositive: number;
  reviewTotal: number;
};

type RawPriceOverview = {
  currency: string;
  initial: number;
  final: number;
  discount_percent: number;
};

type RawAppData = {
  type?: string;
  name: string;
  is_free?: boolean;
  header_image?: string;
  capsule_image?: string;
  short_description?: string;
  genres?: Genre[];
  price_overview?: RawPriceOverview;
  release_date?: { coming_soon: boolean; date: string };
};

type AppDetailsResponse<T> = Record<string, { success: boolean; data?: T | [] }>;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "Accept-Language": "pt-BR,pt;q=0.9" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Steam respondeu ${res.status} para ${url}`);
  return (await res.json()) as T;
}

/** Extracts app IDs from Steam store links or plain numeric IDs found in free text. */
export function parseAppIds(text: string): number[] {
  const ids = new Set<number>();
  for (const m of text.matchAll(/store\.steampowered\.com\/app\/(\d+)/g)) ids.add(Number(m[1]));
  for (const m of text.matchAll(/(?:^|[\s,;])(\d{2,8})(?=$|[\s,;])/g)) ids.add(Number(m[1]));
  return [...ids];
}

export async function searchStore(term: string): Promise<SearchResult[]> {
  const url = `${STORE}/api/storesearch/?term=${encodeURIComponent(term)}&l=${LANGUAGE}&cc=${COUNTRY}`;
  const data = await getJson<{
    items?: { id: number; name: string; tiny_image: string; price?: { initial: number; final: number } }[];
  }>(url);
  return (data.items ?? []).map((i) => ({
    appId: i.id,
    name: i.name,
    image: i.tiny_image,
    priceFinal: i.price?.final ?? null,
    priceInitial: i.price?.initial ?? null,
  }));
}

function toPriceInfo(p: RawPriceOverview | undefined): PriceInfo {
  return {
    currency: p?.currency ?? null,
    priceInitial: p?.initial ?? null,
    priceFinal: p?.final ?? null,
    discountPercent: p?.discount_percent ?? 0,
  };
}

export async function fetchAppDetails(appId: number): Promise<AppDetails | null> {
  const base = `${STORE}/api/appdetails?appids=${appId}&l=${LANGUAGE}`;
  let entry = (await getJson<AppDetailsResponse<RawAppData>>(`${base}&cc=${COUNTRY}`))[appId];
  let availableInRegion = true;
  if (!entry?.success) {
    // Games not sold in Brazil fail with cc=br; fetch the general data without a price.
    entry = (await getJson<AppDetailsResponse<RawAppData>>(base))[appId];
    availableInRegion = false;
  }
  const d = entry?.success && entry.data && !Array.isArray(entry.data) ? entry.data : null;
  if (!d) return null;

  const genres = d.genres ?? [];
  const price = availableInRegion ? toPriceInfo(d.price_overview) : toPriceInfo(undefined);
  return {
    appId,
    name: d.name,
    type: d.type ?? null,
    headerImage: d.header_image ?? null,
    capsuleImage: d.capsule_image ?? null,
    shortDescription: d.short_description ?? null,
    genres,
    isEarlyAccess: genres.some((g) => g.id === EARLY_ACCESS_GENRE_ID),
    isFree: d.is_free ?? false,
    availableInRegion,
    ...price,
    comingSoon: d.release_date?.coming_soon ?? false,
    releaseDateText: d.release_date?.date || null,
    releaseDate: parseReleaseDate(d.release_date?.date),
  };
}

/** Fetches prices for many games in one request (Steam accepts a list only with filters=price_overview). */
export async function fetchPrices(appIds: number[]): Promise<Map<number, PriceInfo>> {
  const result = new Map<number, PriceInfo>();
  for (let i = 0; i < appIds.length; i += 50) {
    const chunk = appIds.slice(i, i + 50);
    const url = `${STORE}/api/appdetails?appids=${chunk.join(",")}&cc=${COUNTRY}&filters=price_overview`;
    const data = await getJson<AppDetailsResponse<{ price_overview?: RawPriceOverview }>>(url);
    for (const id of chunk) {
      const entry = data[id];
      if (!entry?.success) continue;
      // Free and unreleased games come back as an empty array.
      const overview = entry.data && !Array.isArray(entry.data) ? entry.data.price_overview : undefined;
      result.set(id, toPriceInfo(overview));
    }
  }
  return result;
}

export async function fetchReviews(appId: number): Promise<ReviewSummary | null> {
  const url = `${STORE}/appreviews/${appId}?json=1&language=all&purchase_type=all&num_per_page=0`;
  const data = await getJson<{
    success: number;
    query_summary?: { review_score: number; total_positive: number; total_reviews: number };
  }>(url);
  const s = data.query_summary;
  if (!data.success || !s) return null;
  return { reviewScore: s.review_score, reviewPositive: s.total_positive, reviewTotal: s.total_reviews };
}

const MONTHS: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};

const pad = (n: number) => String(n).padStart(2, "0");
const lastDayOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/**
 * Converts Steam's Portuguese release text ("17/set./2020", "outubro de 2026",
 * "4º trimestre de 2026", "2027") into a sortable ISO date. Vague dates resolve
 * to the end of their period. Returns null for texts like "Em breve".
 */
export function parseReleaseDate(text: string | undefined | null): string | null {
  if (!text) return null;
  const t = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const full = t.match(/(\d{1,2})\s*(?:\/|de)?\s*([a-z]{3})[a-z]*\.?\s*(?:\/|de)?\s*(\d{4})/);
  if (full && MONTHS[full[2]]) return `${full[3]}-${pad(MONTHS[full[2]])}-${pad(Number(full[1]))}`;

  const monthYear = t.match(/([a-z]{3})[a-z]*\.?\s*(?:\/|de)?\s*(\d{4})/);
  if (monthYear && MONTHS[monthYear[1]]) {
    const y = Number(monthYear[2]);
    const m = MONTHS[monthYear[1]];
    return `${y}-${pad(m)}-${pad(lastDayOfMonth(y, m))}`;
  }

  const quarter = t.match(/([1-4])\D*trimestre\D*(\d{4})/) ?? t.match(/q([1-4])\s*(\d{4})/);
  if (quarter) {
    const y = Number(quarter[2]);
    const m = Number(quarter[1]) * 3;
    return `${y}-${pad(m)}-${pad(lastDayOfMonth(y, m))}`;
  }

  const year = t.match(/\b(\d{4})\b/);
  if (year) return `${year[1]}-12-31`;
  return null;
}
