import { decodeIdToken } from "arctic";
import { finishLogin, googleClient, redirectTo, takeFlowCookie } from "@/lib/oauth";

type GoogleClaims = { sub: string; name?: string; picture?: string; email?: string; email_verified?: boolean };

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const google = googleClient(request);
  const expectedState = await takeFlowCookie("google_state");
  const codeVerifier = await takeFlowCookie("google_verifier");
  const code = params.get("code");
  if (!google || !code || !codeVerifier || !expectedState || params.get("state") !== expectedState) {
    return redirectTo(request, "/login?error=google");
  }

  let claims: GoogleClaims;
  try {
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    // The ID token comes straight from Google's token endpoint over TLS, so decoding is enough.
    claims = decodeIdToken(tokens.idToken()) as GoogleClaims;
  } catch {
    return redirectTo(request, "/login?error=google");
  }
  return finishLogin(request, {
    provider: "google",
    providerAccountId: claims.sub,
    displayName: claims.name ?? claims.email?.split("@")[0] ?? "Jogador",
    avatarUrl: claims.picture ?? null,
    email: claims.email_verified ? claims.email : null,
  });
}
