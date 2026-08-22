import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, validAdminSession } from "@/lib/adminAuth";
import { clearOverrides, overridesConfigured, readOverrides, writeOverrides } from "@/lib/scheduleStore";
import type { ClassItem } from "@/lib/types";

export const dynamic = "force-dynamic";

const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/;
const NO_STORE = { "Cache-Control": "no-store" };

async function isAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return validAdminSession(token);
}

// Any admin (any device) reads the shared overrides for a week.
export async function GET(request: Request) {
  const week = new URL(request.url).searchParams.get("week") ?? "";
  if (!WEEK_RE.test(week)) return NextResponse.json({ error: "Invalid week." }, { status: 400, headers: NO_STORE });
  const classes = await readOverrides(week);
  return NextResponse.json({ classes, configured: overridesConfigured() }, { headers: NO_STORE });
}

// Save the shared overrides (admin only).
export async function PUT(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  const body = await request.json().catch(() => null);
  const week = typeof body?.week === "string" ? body.week : "";
  if (!WEEK_RE.test(week) || !Array.isArray(body?.classes)) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400, headers: NO_STORE });
  }
  const ok = await writeOverrides(week, body.classes as ClassItem[]);
  if (ok) {
    revalidatePath("/teachers");
    revalidatePath("/stories");
    revalidatePath("/api/schedule");
  }
  return NextResponse.json({ ok, configured: overridesConfigured() }, { status: ok ? 200 : 503, headers: NO_STORE });
}

// Reset a week back to the source schedule (admin only).
export async function DELETE(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  const week = new URL(request.url).searchParams.get("week") ?? "";
  if (!WEEK_RE.test(week)) return NextResponse.json({ error: "Invalid week." }, { status: 400, headers: NO_STORE });
  const ok = await clearOverrides(week);
  if (ok) {
    revalidatePath("/teachers");
    revalidatePath("/stories");
    revalidatePath("/api/schedule");
  }
  return NextResponse.json({ ok }, { status: ok ? 200 : 503, headers: NO_STORE });
}
