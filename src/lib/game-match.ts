/** Matching typed game names against Steam search results. Pure functions, no I/O. */

export type MatchCandidate = { name: string };
export type MatchStatus = "exact" | "approx" | "notfound";

const ROMAN: Record<string, string> = {
  ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8", ix: "9", x: "10",
};

/**
 * Canonical form of a title for comparisons: lowercase, no accents/symbols/punctuation,
 * "&" as "and", standalone Roman numerals as digits and no leading "the".
 * So "Baldur's Gate 3" == "baldurs gate 3" and "Hades 2" == "HADES II".
 */
export function normalizeTitle(s: string): string {
  const words = s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/&/g, " and ")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => ROMAN[w] ?? w);
  if (words[0] === "the" && words.length > 1) words.shift();
  return words.join(" ");
}

// Store search mixes in soundtracks, DLCs and the like; skip them unless asked for.
const EXTRAS = /\b(soundtrack|ost|dlc|demo|artbook|art book|season pass|toolkit|playtest|wallpapers?|dedicated server|sdk)\b/;

export function pickMatch<T extends MatchCandidate>(
  query: string,
  results: T[],
  maxAlternatives = 5,
): { status: MatchStatus; match: T | null; alternatives: T[] } {
  const q = normalizeTitle(query);
  const wantsExtras = EXTRAS.test(q);
  const candidates = wantsExtras ? results : results.filter((r) => !EXTRAS.test(normalizeTitle(r.name)));
  const exact = candidates.find((r) => normalizeTitle(r.name) === q);
  const match = exact ?? candidates[0] ?? null;
  return {
    status: exact ? "exact" : match ? "approx" : "notfound",
    match,
    alternatives: candidates.slice(0, maxAlternatives),
  };
}
