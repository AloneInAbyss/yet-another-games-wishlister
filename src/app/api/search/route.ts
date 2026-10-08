import { getCurrentUser } from "@/lib/auth";
import { UserError } from "@/lib/errors";
import { enforce } from "@/lib/rate-limit";
import { cachedSearch } from "@/lib/steam-search";
import { searchTerm } from "@/lib/validation";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Você precisa entrar para buscar." }, { status: 401 });
  const parsed = searchTerm.safeParse(new URL(request.url).searchParams.get("q") ?? "");
  if (!parsed.success) return Response.json([]);
  try {
    await enforce("search", user.id);
    return Response.json(await cachedSearch(parsed.data));
  } catch (e) {
    if (e instanceof UserError) return Response.json({ error: e.message }, { status: 429 });
    console.error(e);
    return Response.json({ error: "Falha ao buscar na Steam" }, { status: 502 });
  }
}
