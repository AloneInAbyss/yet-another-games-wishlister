import { isAdmin } from "@/lib/auth";
import { searchStore } from "@/lib/steam";

export async function GET(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return Response.json([]);
  try {
    return Response.json(await searchStore(q));
  } catch {
    return Response.json({ error: "Falha ao buscar na Steam" }, { status: 502 });
  }
}
