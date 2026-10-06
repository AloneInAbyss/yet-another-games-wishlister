"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, createSession, destroySession, requireAdmin } from "@/lib/auth";
import { parseAppIds } from "@/lib/steam";
import * as wishlist from "@/lib/wishlist";

export async function login(_: string | null, formData: FormData): Promise<string | null> {
  if (!checkPassword(String(formData.get("password") ?? ""))) return "Senha incorreta";
  await createSession();
  redirect("/");
}

export async function logout() {
  await destroySession();
  revalidatePath("/");
}

export async function addGames(input: string | number[]): Promise<wishlist.AddResult> {
  await requireAdmin();
  const ids = typeof input === "string" ? parseAppIds(input) : input;
  const result = await wishlist.addGames(ids);
  revalidatePath("/");
  return result;
}

export async function removeItem(id: number) {
  await requireAdmin();
  await wishlist.removeItem(id);
  revalidatePath("/");
}

export async function updateItem(id: number, data: { durationHours: number | null; notes: string | null }) {
  await requireAdmin();
  await wishlist.updateItem(id, {
    durationHours: data.durationHours != null && data.durationHours >= 0 ? data.durationHours : null,
    notes: data.notes?.trim() || null,
  });
  revalidatePath("/");
}

export async function moveItem(id: number, prevId: number | null, nextId: number | null) {
  await requireAdmin();
  await wishlist.moveItem(id, prevId, nextId);
  revalidatePath("/");
}

export async function moveItemToTop(id: number) {
  await requireAdmin();
  await wishlist.moveItemToTop(id);
  revalidatePath("/");
}

export async function refreshPrices(): Promise<number> {
  await requireAdmin();
  const count = await wishlist.refreshAllPrices();
  revalidatePath("/");
  return count;
}

export async function refreshGame(appId: number) {
  await requireAdmin();
  await wishlist.refreshGame(appId);
  revalidatePath("/");
}
