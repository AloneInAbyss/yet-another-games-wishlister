import type { Game } from "@/db/schema";

/** Steam tag "Acesso Antecipado", shown as a badge instead of a tag. */
export const EARLY_ACCESS_TAG_ID = 493;

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatPrice = (cents: number) => brl.format(cents / 100);

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

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function describeAddResult(r: { added: number; skipped: number; overLimit: number; notFound: number }): string {
  const parts = [];
  if (r.added) parts.push(plural(r.added, "adicionado", "adicionados"));
  if (r.skipped) parts.push(plural(r.skipped, "já estava na lista", "já estavam na lista"));
  if (r.notFound) parts.push(plural(r.notFound, "não encontrado na Steam", "não encontrados na Steam"));
  if (r.overLimit) parts.push(`${plural(r.overLimit, "ficou", "ficaram")} de fora pelo limite de 500 jogos`);
  return parts.join(" · ") || "Nada para adicionar";
}
