import { auth } from "@/auth";
import { NextResponse } from "next/server";

const AUTH_REDIRECT_ROUTES = ["/login", "/register"]; // если авторизован → /dashboard
const OPEN_ROUTES = ["/"]; // публичные, без редиректа авторизованных
const AUTH_ONLY_FOR_ADMIN = ["/admin"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth?.user;
  const role = req.auth?.user?.role;

  if (pathname.startsWith("/api/auth")) return NextResponse.next();
  // API handlers manage their own auth — middleware only handles page routes
  if (pathname.startsWith("/api/")) return NextResponse.next();

  if (OPEN_ROUTES.includes(pathname)) return NextResponse.next();

  if (AUTH_REDIRECT_ROUTES.some((r) => pathname.startsWith(r))) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    AUTH_ONLY_FOR_ADMIN.some((r) => pathname.startsWith(r)) &&
    role !== "admin"
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
