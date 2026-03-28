import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

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

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("access_token")?.value;
  if (!token) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      method: "GET",
      headers: {
        Cookie: request.headers.get("cookie") || "",
      },
      cache: "no-store",
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname !== "/login" && !isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  const isAuthenticated = await hasValidSession(request);

  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (pathname === "/login") {
    return NextResponse.next();
  }

  if (!isAuthenticated) {
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
