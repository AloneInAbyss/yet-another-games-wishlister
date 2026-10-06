import { revalidatePath } from "next/cache";
import { refreshAllPrices, refreshStaleDetails } from "@/lib/wishlist";

export const maxDuration = 300;

/** Called daily by Vercel Cron (see vercel.json), which sends the CRON_SECRET as a bearer token. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }
  const prices = await refreshAllPrices();
  const details = await refreshStaleDetails(40);
  revalidatePath("/");
  return Response.json({ prices, details });
}
