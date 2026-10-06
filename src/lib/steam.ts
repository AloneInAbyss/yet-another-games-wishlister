import "server-only";
import { inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { steamTags, type Tag } from "@/db/schema";
import { steamFetch, steamJson } from "./steam-client";

export { parseAppIds } from "./app-ids";

const STORE = "https://store.steampowered.com";
const API = "https://api.steampowered.com";
const COMMUNITY = "https://steamcommunity.com";
const ASSETS = "https://shared.akamai.steamstatic.com/store_item_assets";
const COUNTRY = "BR";
const LANGUAGE = "brazilian";
const BATCH_SIZE = 100;
const TAGS_PER_GAME = 10;

const sqlExcluded = (column: string) => sql.raw(`excluded.${column}`);

export type SearchResult = {
  appId: number;
  name: string;
  image: string;
  priceFinal: number | null;
  priceInitial: number | null;
};

/** Normalized store data for one game, ready to be saved in `games`. */
export type StoreItem = {
  appId: number;
  name: string;
  capsuleImage: string | null;
  headerImage: string | null;
  tags: Tag[];
  isEarlyAccess: boolean;
  isFree: boolean;
  priceInitial: number | null;
  priceFinal: number | null;
  discountPercent: number;
  comingSoon: boolean;
  releaseDateText: string | null;
  releaseDate: string | null;
  reviewScore: number | null;
  reviewPercent: number | null;
  reviewTotal: number | null;
};

type RawStoreItem = {
  appid: number;
  success: number;
  name?: string;
  is_free?: boolean;
  is_early_access?: boolean;
  best_purchase_option?: {
    final_price_in_cents?: string;
    original_price_in_cents?: string;
    discount_pct?: number;
  } | null;
  release?: {
    steam_release_date?: number;
    is_coming_soon?: boolean;
    custom_release_date_message?: string;
    coming_soon_display?: string;
  };
  reviews?: { summary_filtered?: { review_count: number; percent_positive: number; review_score: number } };
  tags?: { tagid: number; weight: number }[];
  assets?: { asset_url_format?: string; small_capsule?: string; header?: string };
};

export async function searchStore(term: string): Promise<SearchResult[]> {
  const url = `${STORE}/api/storesearch/?term=${encodeURIComponent(term)}&l=${LANGUAGE}&cc=${COUNTRY}`;
  const data = await steamJson<{
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

/** Fetches store data for any number of games, 100 per request. Unknown IDs are left out. */
export async function fetchItems(appIds: number[]): Promise<StoreItem[]> {
  const raw: RawStoreItem[] = [];
  for (let i = 0; i < appIds.length; i += BATCH_SIZE) {
    const input = {
      ids: appIds.slice(i, i + BATCH_SIZE).map((appid) => ({ appid })),
      context: { language: LANGUAGE, country_code: COUNTRY },
      data_request: {
        include_assets: true,
        include_release: true,
        include_reviews: true,
        include_tag_count: TAGS_PER_GAME,
      },
    };
    const url = `${API}/IStoreBrowseService/GetItems/v1/?input_json=${encodeURIComponent(JSON.stringify(input))}`;
    const data = await steamJson<{ response: { store_items?: RawStoreItem[] } }>(url);
    raw.push(...(data.response.store_items ?? []).filter((it) => it.success === 1 && it.name));
  }
  const tagNames = await getTagNames(raw.flatMap((it) => (it.tags ?? []).map((t) => t.tagid)));
  return raw.map((it) => normalize(it, tagNames));
}

function normalize(it: RawStoreItem, tagNames: Map<number, string>): StoreItem {
  const price = it.best_purchase_option;
  const final = price?.final_price_in_cents != null ? Number(price.final_price_in_cents) : null;
  const original = price?.original_price_in_cents != null ? Number(price.original_price_in_cents) : final;
  const reviews = it.reviews?.summary_filtered;
  const asset = (file?: string) =>
    file && it.assets?.asset_url_format ? `${ASSETS}/${it.assets.asset_url_format.replace("${FILENAME}", file)}` : null;
  const tags = [...(it.tags ?? [])]
    .sort((a, b) => b.weight - a.weight)
    .flatMap((t) => (tagNames.has(t.tagid) ? [{ id: t.tagid, name: tagNames.get(t.tagid)!.trim() }] : []));

  return {
    appId: it.appid,
    name: it.name!,
    capsuleImage: asset(it.assets?.small_capsule),
    headerImage: asset(it.assets?.header),
    tags,
    isEarlyAccess: it.is_early_access ?? false,
    isFree: it.is_free ?? false,
    priceInitial: original,
    priceFinal: final,
    discountPercent: price?.discount_pct ?? 0,
    ...releaseInfo(it.release),
    reviewScore: reviews?.review_score ?? null,
    reviewPercent: reviews?.review_count ? reviews.percent_positive : null,
    reviewTotal: reviews?.review_count ?? null,
  };
}

const fullDate = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const monthYear = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

function releaseInfo(r: RawStoreItem["release"]): Pick<StoreItem, "comingSoon" | "releaseDate" | "releaseDateText"> {
  const comingSoon = r?.is_coming_soon ?? false;
  const ts = r?.steam_release_date;
  if (!ts || (comingSoon && r?.coming_soon_display === "text_comingsoon")) {
    return { comingSoon, releaseDate: null, releaseDateText: r?.custom_release_date_message || (comingSoon ? "Em breve" : null) };
  }
  const date = new Date(ts * 1000);
  const iso = date.toISOString().slice(0, 10);
  let text: string;
  switch (comingSoon ? r?.coming_soon_display : "date_full") {
    case "date_month":
      text = monthYear.format(date);
      break;
    case "date_quarter":
      text = `${Math.floor(date.getUTCMonth() / 3) + 1}º trimestre de ${date.getUTCFullYear()}`;
      break;
    case "date_year":
      text = String(date.getUTCFullYear());
      break;
    default:
      text = fullDate.format(date);
  }
  return { comingSoon, releaseDate: iso, releaseDateText: text };
}

/** Resolves tag names from the DB, refreshing the list from Steam when an unknown tag appears. */
async function getTagNames(ids: number[]): Promise<Map<number, string>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();
  const load = async () =>
    new Map(
      (await db.select().from(steamTags).where(inArray(steamTags.id, unique))).map((t) => [t.id, t.name] as const),
    );
  let names = await load();
  if (unique.some((id) => !names.has(id))) {
    const data = await steamJson<{ response: { tags?: { tagid: number; name: string }[] } }>(
      `${API}/IStoreService/GetTagList/v1/?language=${LANGUAGE}`,
    );
    const rows = (data.response.tags ?? []).map((t) => ({ id: t.tagid, name: t.name.trim() }));
    for (let i = 0; i < rows.length; i += 200) {
      await db
        .insert(steamTags)
        .values(rows.slice(i, i + 200))
        .onConflictDoUpdate({ target: steamTags.id, set: { name: sqlExcluded("name") } });
    }
    names = await load();
  }
  return names;
}


export type WishlistEntryRaw = { appId: number; priority: number; dateAdded: number };

/**
 * Returns the app IDs of a public Steam wishlist in the owner's order: ranked items
 * (priority 1, 2, …) first, then unranked ones (priority 0) by date added.
 * Private and empty wishlists both come back empty — Steam does not tell them apart.
 */
export async function fetchWishlist(steamId: string): Promise<number[]> {
  const data = await steamJson<{
    response: { items?: { appid: number; priority: number; date_added: number }[] };
  }>(`${API}/IWishlistService/GetWishlist/v1/?steamid=${steamId}`);
  return (data.response.items ?? [])
    .sort((a, b) => {
      const pa = a.priority || Infinity;
      const pb = b.priority || Infinity;
      return pa !== pb ? pa - pb : a.date_added - b.date_added;
    })
    .map((i) => i.appid);
}

export type SteamProfile = { steamId: string; name: string; avatarUrl: string | null; isPublic: boolean };

/** Accepts a profile link (/id/<name> or /profiles/<id>), a SteamID64 or a custom URL name. */
export function parseProfileInput(input: string): { kind: "id" | "vanity"; value: string } | null {
  const text = input.trim();
  const byId = text.match(/steamcommunity\.com\/profiles\/(\d{17})/) ?? text.match(/^(7656119\d{10})$/);
  if (byId) return { kind: "id", value: byId[1] };
  const byVanity = text.match(/steamcommunity\.com\/id\/([\w-]{2,32})/) ?? text.match(/^([\w-]{2,32})$/);
  if (byVanity) return { kind: "vanity", value: byVanity[1] };
  return null;
}

export async function fetchSteamProfile(input: { kind: "id" | "vanity"; value: string }): Promise<SteamProfile | null> {
  const path = input.kind === "id" ? `profiles/${input.value}` : `id/${encodeURIComponent(input.value)}`;
  const res = await steamFetch(`${COMMUNITY}/${path}/?xml=1`);
  if (!res.ok) return null;
  const xml = await res.text();
  const tag = (name: string) =>
    xml.match(new RegExp(`<${name}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${name}>`))?.[1]?.trim() ?? null;
  const steamId = tag("steamID64");
  if (!steamId) return null;
  return {
    steamId,
    name: tag("steamID") || "Jogador Steam",
    avatarUrl: tag("avatarMedium"),
    isPublic: tag("privacyState") === "public",
  };
}
