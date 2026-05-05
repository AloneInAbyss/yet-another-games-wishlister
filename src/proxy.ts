import { routeAccess, routes } from "@/lib/routes";
import { updateSession } from "@/lib/supabase/proxy";
import { NextResponse, type NextRequest } from "next/server";

function matchesAnyPrefix(pathname: string, prefixes: readonly string[]) {
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  const { user, response } = await updateSession(request);

  const isAuthRoute = matchesAnyPrefix(request.nextUrl.pathname, routeAccess.authOnly);
  const isProtectedRoute = matchesAnyPrefix(
    request.nextUrl.pathname,
    routeAccess.protected,
  );

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = routes.auth.login;
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = routes.app.dashboard;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
