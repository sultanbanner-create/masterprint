import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public paths that do not require authentication
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/test-tz",
  "/logo.png",
  "/icon.svg",
  "/manifest.json",
  "/favicon.ico",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public static assets and files
  if (
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith("/track/")) ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Read session cookie
  const sessionCookie = request.cookies.get("mp_auth_session")?.value;

  if (!sessionCookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Decode payload to check expiration and roles
  try {
    const [base64Data] = sessionCookie.split(".");
    if (!base64Data) throw new Error("Invalid token format");
    
    // Base64Url decode in standard JS
    const jsonStr = atob(base64Data.replace(/-/g, "+").replace(/_/g, "/"));
    const user = JSON.parse(jsonStr);

    if (user.exp && user.exp < Date.now()) {
      const loginUrl = new URL("/login", request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("mp_auth_session");
      return response;
    }

    const isDirector = user.role === "DIRECTOR";

    // 4. Финансовые отчеты, касса, зарплаты и бэкапы доступны ТОЛЬКО директору (Тимуру)
    if (!isDirector) {
      const isRestrictedFinancialRoute =
        pathname.startsWith("/finance") ||
        pathname.startsWith("/reports") ||
        pathname.startsWith("/payroll") ||
        pathname.startsWith("/settings/backup") ||
        pathname.startsWith("/settings/services") ||
        pathname.startsWith("/settings/pricing");

      if (isRestrictedFinancialRoute) {
        // Сотрудникам доступны только заказы и канбан цеха
        return NextResponse.redirect(new URL("/orders", request.url));
      }
    }

    return NextResponse.next();
  } catch (err) {
    const loginUrl = new URL("/login", request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("mp_auth_session");
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
