/** Collection colors, readable on the dark background. Shared by the browser and the server. */
export const COLLECTION_COLORS = {
  sky: { label: "Azul", hex: "#7dd3fc" },
  emerald: { label: "Verde", hex: "#6ee7b7" },
  amber: { label: "Âmbar", hex: "#fcd34d" },
  rose: { label: "Rosa", hex: "#fda4af" },
  violet: { label: "Violeta", hex: "#c4b5fd" },
  orange: { label: "Laranja", hex: "#fdba74" },
  lime: { label: "Lima", hex: "#bef264" },
  pink: { label: "Pink", hex: "#f9a8d4" },
} as const;

export type CollectionColor = keyof typeof COLLECTION_COLORS;
export const COLOR_KEYS = Object.keys(COLLECTION_COLORS) as CollectionColor[];

export const MAX_COLLECTIONS = 30;
export const MAX_COLLECTION_NAME = 30;

/** What the list page needs about each collection. */
export type CollectionInfo = { id: number; name: string; color: CollectionColor; count: number };

export function colorHex(color: string): string {
  return (COLLECTION_COLORS as Record<string, { hex: string }>)[color]?.hex ?? COLLECTION_COLORS.sky.hex;
}

/** The first palette color not used yet (cycling once all are taken). */
export function nextColor(used: string[]): CollectionColor {
  return COLOR_KEYS.find((c) => !used.includes(c)) ?? COLOR_KEYS[used.length % COLOR_KEYS.length];
}
