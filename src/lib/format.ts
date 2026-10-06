import type { Game } from "@/db/schema";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatPrice = (cents: number) => brl.format(cents / 100);

export function reviewPercent(game: Pick<Game, "reviewPositive" | "reviewTotal">): number | null {
  if (!game.reviewTotal || game.reviewPositive == null) return null;
  return Math.round((game.reviewPositive / game.reviewTotal) * 100);
}

const REVIEW_LABELS: Record<number, string> = {
  9: "Extremamente positivas",
  8: "Muito positivas",
  7: "Positivas",
  6: "Ligeiramente positivas",
  5: "Neutras",
  4: "Ligeiramente negativas",
  3: "Negativas",
  2: "Muito negativas",
  1: "Extremamente negativas",
};

export function reviewLabel(game: Pick<Game, "reviewScore" | "reviewTotal">): string {
  return (game.reviewScore && REVIEW_LABELS[game.reviewScore]) || "Poucas avaliações";
}

/** Steam's colour scheme: blue for positive, amber for mixed, orange for negative. */
export function reviewTone(score: number | null): "positive" | "mixed" | "negative" | "none" {
  if (!score) return "none";
  if (score >= 6) return "positive";
  if (score === 5) return "mixed";
  return "negative";
}

export function formatHours(hours: number): string {
  return `${hours.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
}

export const storeUrl = (appId: number) => `https://store.steampowered.com/app/${appId}`;
export const hltbUrl = (name: string) => `https://howlongtobeat.com/?q=${encodeURIComponent(name)}`;
export const itadUrl = (name: string) => `https://isthereanydeal.com/search/?q=${encodeURIComponent(name)}`;
