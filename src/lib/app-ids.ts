/** Extracts app IDs from Steam store links or plain numeric IDs found in free text. */
export function parseAppIds(text: string): number[] {
  const ids = new Set<number>();
  for (const m of text.matchAll(/store\.steampowered\.com\/app\/(\d+)/g)) ids.add(Number(m[1]));
  for (const m of text.matchAll(/(?:^|[\s,;])(\d{2,8})(?=$|[\s,;])/g)) ids.add(Number(m[1]));
  return [...ids];
}
