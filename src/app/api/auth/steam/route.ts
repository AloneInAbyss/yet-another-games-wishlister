import { randomId } from "@/lib/auth";
import { guardLoginStart, setFlowCookie, STEAM_OPENID } from "@/lib/oauth";

/** Starts Steam's OpenID 2.0 login. The state cookie ties the callback to this browser. */
export async function GET(request: Request) {
  const blocked = await guardLoginStart(request);
  if (blocked) return blocked;
  const state = randomId();
  await setFlowCookie("steam_state", state);
  const origin = new URL(request.url).origin;
  const returnTo = `${origin}/api/auth/steam/callback?state=${state}`;
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": origin,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return Response.redirect(`${STEAM_OPENID}?${params}`, 302);
}
