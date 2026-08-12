import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, validAdminSession } from "@/lib/adminAuth";

export async function middleware(request: NextRequest) {
  if (await validAdminSession(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/stories/:path*"],
};
