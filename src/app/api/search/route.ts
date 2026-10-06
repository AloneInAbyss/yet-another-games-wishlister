import { unstable_cache } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { UserError } from "@/lib/errors";
import { enforce } from "@/lib/rate-limit";
import { searchStore } from "@/lib/steam";
import { searchTerm } from "@/lib/validation";

// Shared across server instances, so repeated searches don't hit Steam again.
const cachedSearch = unstable_cache(searchStore, ["steam-search"], { revalidate: 3600 });

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Você precisa entrar para buscar." }, { status: 401 });
  const parsed = searchTerm.safeParse(new URL(request.url).searchParams.get("q") ?? "");
  if (!parsed.success) return Response.json([]);
  try {
    await enforce("search", user.id);
    return Response.json(await cachedSearch(parsed.data.toLowerCase().replace(/\s+/g, " ")));
  } catch (e) {
    if (e instanceof UserError) return Response.json({ error: e.message }, { status: 429 });
    console.error(e);
    return Response.json({ error: "Falha ao buscar na Steam" }, { status: 502 });
  }
}
