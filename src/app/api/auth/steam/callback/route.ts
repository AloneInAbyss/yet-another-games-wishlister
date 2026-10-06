import { fetchSteamProfile } from "@/lib/steam";
import { finishLogin, redirectTo, STEAM_OPENID, takeFlowCookie } from "@/lib/oauth";

const CLAIMED_ID = /^https:\/\/steamcommunity\.com\/openid\/id\/(7656119\d{10})$/;

/** Asks Steam itself whether the signed response is genuine (OpenID "check_authentication"). */
async function verifyWithSteam(params: URLSearchParams): Promise<boolean> {
  const body = new URLSearchParams(params);
  body.set("openid.mode", "check_authentication");
  const res = await fetch(STEAM_OPENID, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  return res.ok && /^is_valid\s*:\s*true$/m.test(await res.text());
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const state = params.get("state");
  const expectedState = await takeFlowCookie("steam_state");
  const expectedReturnTo = `${url.origin}/api/auth/steam/callback?state=${state}`;
  const steamId = params.get("openid.claimed_id")?.match(CLAIMED_ID)?.[1];

  const valid =
    !!state &&
    state === expectedState &&
    params.get("openid.mode") === "id_res" &&
    params.get("openid.op_endpoint") === STEAM_OPENID &&
    params.get("openid.return_to") === expectedReturnTo &&
    !!steamId &&
    (await verifyWithSteam(params).catch(() => false));
  if (!valid || !steamId) return redirectTo(request, "/login?error=steam");

  const profile = await fetchSteamProfile({ kind: "id", value: steamId }).catch(() => null);
  return finishLogin(request, {
    provider: "steam",
    providerAccountId: steamId,
    displayName: profile?.name ?? "Jogador Steam",
    avatarUrl: profile?.avatarUrl ?? null,
  });
}
