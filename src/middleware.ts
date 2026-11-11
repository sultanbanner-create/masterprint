import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, integrationApiKey } from "@/lib/session-config";
import { verifySessionEdge } from "@/lib/session-edge";

// Страницы и API, открытые без входа
const PUBLIC_EXACT = new Set([
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/telegram/webhook", // Telegram проверяется секретным заголовком внутри маршрута
  "/manifest.json",
  "/favicon.ico",
]);

// Мини-приложение Telegram и трекер для клиента открыты как страницы;
// данные в мини-приложении всё равно требуют входа (см. TmaAuthGate).
const PUBLIC_PAGE_PREFIXES = ["/tma", "/track/"];

// Только настоящие статические файлы из /public, и никогда не API
const STATIC_FILE = /\.(png|jpe?g|gif|webp|svg|ico|txt|xml|webmanifest|woff2?|ttf|map)$/i;

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (!pathname.startsWith("/api/") && STATIC_FILE.test(pathname)) return true;
  return PUBLIC_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : p + "/"));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function toLogin(request: NextRequest, pathname: string, clearCookie = false) {
  if (pathname.startsWith("/api/")) {
    const res = NextResponse.json({ error: "Нужно войти в систему" }, { status: 401 });
    if (clearCookie) res.cookies.delete(SESSION_COOKIE);
    return res;
  }
  const loginUrl = new URL("/login", request.url);
  if (pathname && pathname !== "/") loginUrl.searchParams.set("from", pathname);
  const res = NextResponse.redirect(loginUrl);
  if (clearCookie) res.cookies.delete(SESSION_COOKIE);
  return res;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  // Ключ внешней интеграции (Jarvis): только для API и только из переменной окружения
  if (pathname.startsWith("/api/")) {
    const expectedKey = integrationApiKey();
    const providedKey =
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      request.nextUrl.searchParams.get("api_key");
    if (expectedKey && providedKey && constantTimeEqual(providedKey.trim(), expectedKey)) {
      return NextResponse.next();
    }
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return toLogin(request, pathname);

  const user = await verifySessionEdge(token);
  if (!user) return toLogin(request, pathname, true);

  if (user.role !== "DIRECTOR") {
    // Финансы, зарплаты, бэкапы и прайсы — только директору
    const restrictedApi =
      pathname.startsWith("/api/backup") ||
      pathname.startsWith("/api/payroll") ||
      pathname.startsWith("/api/finance");
    if (restrictedApi) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const restrictedPage =
      pathname.startsWith("/finance") ||
      pathname.startsWith("/reports") ||
      pathname.startsWith("/payroll") ||
      pathname.startsWith("/settings/backup") ||
      pathname.startsWith("/settings/services") ||
      pathname.startsWith("/settings/pricing");
    if (restrictedPage) {
      return NextResponse.redirect(new URL("/orders", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
