import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, validAdminSession } from "@/lib/adminAuth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow the login page and the login API through so unauthenticated
  // users can actually sign in (avoids a redirect loop on /admin/login).
  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  if (await validAdminSession(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  // Guard the gated story downloads and any /admin route. Static assets
  // (_next/*, favicon, etc.) and other API routes are never matched.
  matcher: ["/stories/:path*", "/admin/:path*"],
};
