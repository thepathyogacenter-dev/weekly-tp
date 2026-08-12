import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminAccessConfigured,
  adminSessionMaxAge,
  createAdminSession,
  validAdminPassword,
} from "@/lib/adminAuth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!adminAccessConfigured()) {
    return NextResponse.json(
      { error: "Admin login is not configured yet." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!await validAdminPassword(password)) {
    return NextResponse.json(
      { error: "Incorrect password." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const session = await createAdminSession();
  if (!session) {
    return NextResponse.json(
      { error: "Admin login is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(ADMIN_COOKIE, session, {
    httpOnly: true,
    maxAge: adminSessionMaxAge,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
