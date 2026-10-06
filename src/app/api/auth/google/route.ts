import { generateCodeVerifier, generateState } from "arctic";
import { googleClient, guardLoginStart, redirectTo, setFlowCookie } from "@/lib/oauth";

export async function GET(request: Request) {
  const google = googleClient(request);
  if (!google) return redirectTo(request, "/login?error=google_unavailable");
  const blocked = await guardLoginStart(request);
  if (blocked) return blocked;
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  await setFlowCookie("google_state", state);
  await setFlowCookie("google_verifier", codeVerifier);
  const url = google.createAuthorizationURL(state, codeVerifier, ["openid", "profile", "email"]);
  return Response.redirect(url, 302);
}
