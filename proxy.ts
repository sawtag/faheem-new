import { NextResponse, type NextRequest } from "next/server";

/**
 * Mock auth gate (AGENTS.md rule 10 — cookie presence = authenticated, no real
 * security). Everything except /login, /api/auth, /_next, static assets, and
 * /api/documents requires the `faheem_session` cookie set by
 * app/api/auth/route.ts. Cookie name is duplicated (not imported) between the
 * two files — trivial string, not worth an indirection layer (AGENTS.md rule 6).
 *
 * Lives in `proxy.ts` (Next 16 convention — the old `middleware.ts` filename is
 * deprecated and warns at build); the exported function is named `proxy` to
 * match.
 */
const SESSION_COOKIE = "faheem_session";
const PUBLIC_PATHS = ["/login", "/api/auth", "/api/documents"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname) || request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf)$).*)",
  ],
};
