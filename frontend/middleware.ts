import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/rooms",
  "/documents",
];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;

  if (/^\/rooms\/[^/]+$/.test(pathname)) return true;

  if (/^\/documents\/[^/]+$/.test(pathname)) return true;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return true;
  }

  return false;
}

function isProtectedRoute(pathname: string): boolean {
  if (pathname === "/home") return true;
  if (/^\/exams\/[^/]+$/.test(pathname)) return true;
  return !isPublicRoute(pathname);
}

function hasSessionCookie(request: NextRequest): boolean {
  return !!request.cookies.get("access_token")?.value;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  if (!hasSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("access_token");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
