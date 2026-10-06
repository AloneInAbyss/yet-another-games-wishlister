import { finishLogin } from "@/lib/oauth";

/** Development-only login used by automated tests. Disabled unless explicitly enabled. */
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development" || process.env.ALLOW_DEV_LOGIN !== "1") {
    return new Response("Not found", { status: 404 });
  }
  const name = new URL(request.url).searchParams.get("name")?.slice(0, 30) || "dev";
  return finishLogin(request, { provider: "dev", providerAccountId: name, displayName: name, avatarUrl: null });
}
