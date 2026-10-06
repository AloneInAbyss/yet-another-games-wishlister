import "server-only";
import { cookies } from "next/headers";
import { Google } from "arctic";
import { clientIp } from "./auth";
import { RateLimitError } from "./errors";
import { signInWithProvider, type ProviderProfile } from "./accounts";
import { enforce } from "./rate-limit";

export const STEAM_OPENID = "https://steamcommunity.com/openid/login";

const FLOW_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 600,
  path: "/",
};

export async function setFlowCookie(name: string, value: string) {
  (await cookies()).set(name, value, FLOW_COOKIE_OPTIONS);
}

/** Reads and deletes a one-time cookie used during a login flow. */
export async function takeFlowCookie(name: string): Promise<string | undefined> {
  const store = await cookies();
  const value = store.get(name)?.value;
  store.delete(name);
  return value;
}

export function redirectTo(request: Request, path: string) {
  return Response.redirect(new URL(path, request.url), 303);
}

/** Rate limits the start of a login flow by IP. Returns a redirect response when blocked. */
export async function guardLoginStart(request: Request): Promise<Response | null> {
  try {
    await enforce("loginIp", await clientIp());
    return null;
  } catch (e) {
    if (e instanceof RateLimitError) return redirectTo(request, "/login?error=rate_limited");
    throw e;
  }
}

export async function finishLogin(request: Request, profile: ProviderProfile): Promise<Response> {
  try {
    return redirectTo(request, await signInWithProvider(profile, await clientIp()));
  } catch (e) {
    if (e instanceof RateLimitError) return redirectTo(request, "/login?error=rate_limited");
    console.error(e);
    return redirectTo(request, "/login?error=failed");
  }
}

export function googleClient(request: Request): Google | null {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) return null;
  return new Google(id, secret, new URL("/api/auth/google/callback", request.url).toString());
}

export const isGoogleConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
