"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { redirect } from "next/navigation";
import type { User } from "@/db/schema";
import * as accounts from "@/lib/accounts";
import { destroySession, requireUser } from "@/lib/auth";
import { UserError } from "@/lib/errors";
import { appIdFromLine, resolveLines } from "@/lib/bulk-resolve";
import { enforce } from "@/lib/rate-limit";
import { fetchSteamProfile, parseAppIds, parseProfileInput } from "@/lib/steam";
import * as v from "@/lib/validation";
import * as wishlist from "@/lib/wishlist";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Runs an action for the logged-in user and converts failures into a message for the UI.
 * (In production Next.js hides thrown error messages, so errors are returned instead.)
 */
async function run<T>(fn: (user: User) => Promise<T>, { readOnly = false } = {}): Promise<ActionResult<T>> {
  try {
    const user = await requireUser();
    const data = await fn(user);
    if (user.username && !readOnly) revalidatePath(`/u/${user.username}`);
    return { ok: true, data };
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Algo deu errado. Tente de novo." };
  }
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success) throw new UserError(v.firstIssue(r.error));
  return r.data;
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function addGames(input: string | number[]) {
  return run(async (user) => {
    const raw = parse(v.addGamesInput, input);
    const ids = parse(v.appIds, typeof raw === "string" ? parseAppIds(raw) : raw);
    await enforce("addGames", user.id, ids.length);
    return wishlist.addGames(user.id, ids);
  });
}

/** Looks up a chunk of typed names for the bulk-add review. Doesn't change the list. */
export async function resolveGameNames(lines: string[]) {
  return run(
    async (user) => {
      const input = parse(v.bulkLines, lines);
      const names = input.filter((l) => appIdFromLine(l) == null).length;
      if (names) await enforce("bulkSearch", user.id, names);
      return resolveLines(input);
    },
    { readOnly: true },
  );
}

export async function importSteamWishlist(profile?: string) {
  return run(async (user) => {
    const text = parse(v.profileInput, profile);
    let steamId: string | null;
    let profileName: string | null = null;
    if (text) {
      const parsed = parseProfileInput(text);
      if (!parsed) throw new UserError("Não reconheci esse perfil. Cole o link do seu perfil na Steam.");
      const found = await fetchSteamProfile(parsed);
      if (!found) throw new UserError("Perfil não encontrado na Steam.");
      steamId = found.steamId;
      profileName = found.name;
    } else {
      steamId = await accounts.getSteamId(user.id);
      if (!steamId) throw new UserError("Conecte sua conta Steam ou informe o link do perfil.");
    }
    await enforce("importShort", user.id);
    await enforce("importDaily", user.id);
    return { profileName, ...(await wishlist.importSteamWishlist(user.id, steamId)) };
  });
}

export async function removeItem(id: number) {
  return run(async (user) => {
    await enforce("mutate", user.id);
    await wishlist.removeItem(user.id, parse(v.itemId, id));
    return null;
  });
}

export async function restoreItem(data: {
  appId: number;
  position: number;
  durationHours: number | null;
  notes: string | null;
  addedAt: number;
}) {
  return run(async (user) => {
    await enforce("mutate", user.id);
    const input = parse(v.restoreInput, data);
    await wishlist.restoreItem(user.id, { ...input, notes: input.notes?.trim() || null, addedAt: new Date(input.addedAt) });
    return null;
  });
}

export async function updateItem(id: number, data: { durationHours: number | null; notes: string | null }) {
  return run(async (user) => {
    await enforce("mutate", user.id);
    const input = parse(v.itemUpdate, data);
    await wishlist.updateItem(user.id, parse(v.itemId, id), {
      durationHours: input.durationHours,
      notes: input.notes?.trim() || null,
    });
    return null;
  });
}

export async function moveItem(id: number, prevId: number | null, nextId: number | null) {
  return run(async (user) => {
    await enforce("mutate", user.id);
    const optionalId = v.itemId.nullable();
    await wishlist.moveItem(user.id, parse(v.itemId, id), parse(optionalId, prevId), parse(optionalId, nextId));
    return null;
  });
}

export async function moveItemToTop(id: number) {
  return run(async (user) => {
    await enforce("mutate", user.id);
    await wishlist.moveItemToTop(user.id, parse(v.itemId, id));
    return null;
  });
}

export async function refreshItem(id: number) {
  return run(async (user) => {
    await enforce("refreshGame", user.id);
    await wishlist.refreshItem(user.id, parse(v.itemId, id));
    return null;
  });
}

export async function saveUsername(_: unknown, formData: FormData): Promise<ActionResult<string>> {
  const result = await run(async (user) => {
    const username = parse(v.username, formData.get("username"));
    if (username === user.username) return username;
    await enforce("username", user.id);
    await accounts.setUsername(user.id, username);
    if (user.username) revalidatePath(`/u/${user.username}`);
    return username;
  });
  if (result.ok && formData.get("next") === "list") redirect(`/u/${result.data}?welcome=1`);
  if (result.ok) revalidatePath("/settings");
  return result;
}

export async function setListVisibility(listPublic: boolean) {
  return run(async (user) => {
    await accounts.setListVisibility(user.id, listPublic === true);
    revalidatePath("/settings");
    return null;
  });
}

export async function deleteAccount(confirmation: string) {
  const result = await run(async (user) => {
    if (confirmation.trim().toLowerCase() !== (user.username ?? "excluir")) {
      throw new UserError("Digite o seu nome de usuário para confirmar.");
    }
    await accounts.deleteUser(user.id);
    return null;
  });
  if (result.ok) {
    await destroySession();
    redirect("/");
  }
  return result;
}
