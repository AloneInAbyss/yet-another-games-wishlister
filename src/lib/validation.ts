import { z } from "zod";
import { BULK_CHUNK_SIZE } from "./bulk-limits";

export const MAX_ITEMS_PER_LIST = 500;
export const MAX_IDS_PER_ADD = 50;

const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "api", "app", "auth", "login", "logout", "settings", "onboarding",
  "u", "user", "users", "yagw", "steam", "google", "help", "about", "root", "support", "null",
  "undefined", "me", "new", "static", "_next",
]);

export const itemId = z.number().int().positive();
export const appIds = z.array(z.number().int().positive().max(100_000_000)).min(1).max(MAX_IDS_PER_ADD);

export const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Use pelo menos 3 caracteres")
  .max(20, "Use no máximo 20 caracteres")
  .regex(/^[a-z0-9_-]+$/, "Use apenas letras minúsculas, números, _ e -")
  .refine((u) => !RESERVED_USERNAMES.has(u), "Esse nome é reservado");

export const itemUpdate = z.object({
  durationHours: z.number().min(0).max(10_000).nullable(),
  notes: z.string().max(1000, "Notas com no máximo 1.000 caracteres").nullable(),
});

export const restoreInput = itemUpdate.extend({
  appId: z.number().int().positive().max(100_000_000),
  position: z.number(),
  addedAt: z.number().int().positive().refine((t) => t <= Date.now() + 86_400_000),
});

export const addGamesInput = z.union([z.string().max(5000), appIds]);
export const profileInput = z.string().trim().max(200).optional();
export const bulkLines = z
  .array(z.string().trim().min(1).max(100, "Cada nome pode ter no máximo 100 caracteres"))
  .min(1)
  .max(BULK_CHUNK_SIZE);

export const searchTerm = z.string().trim().min(2).max(100);

/** Turns any display name into a valid username candidate (may still be taken). */
export function suggestUsername(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "")
    .slice(0, 20);
  const candidate = base.length >= 3 ? base : `jogador${base}`;
  return RESERVED_USERNAMES.has(candidate) ? `${candidate}-1` : candidate;
}

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dados inválidos";
}
