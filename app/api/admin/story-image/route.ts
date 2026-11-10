import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, validAdminSession } from "@/lib/adminAuth";
import { readStoryImage, writeStoryImage } from "@/lib/scheduleStore";

export const dynamic = "force-dynamic";

const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/;
const NO_STORE = { "Cache-Control": "no-store" };

async function isAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return validAdminSession(token);
}

export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  const url = new URL(request.url);
  const week = url.searchParams.get("week") ?? "";
  const event = url.searchParams.get("event") ?? "";
  const name = (url.searchParams.get("name") ?? "").slice(0, 200);
  if (!WEEK_RE.test(week) || !event || event.length > 200) return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: NO_STORE });
  const image = await readStoryImage(week, event, name);
  return NextResponse.json({ image }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  const body = await request.json().catch(() => null);
  const week = typeof body?.week === "string" ? body.week : "";
  const event = typeof body?.event === "string" ? body.event : "";
  const image = typeof body?.image === "string" ? body.image : "";
  if (!WEEK_RE.test(week) || !event || event.length > 200 || !/^data:image\/(png|jpeg|webp);base64,/.test(image) || image.length > 650_000) {
    return NextResponse.json({ error: "Use a PNG, JPG, or WebP image below 500 KB." }, { status: 400, headers: NO_STORE });
  }
  const name = typeof body?.name === "string" ? body.name.slice(0, 200) : "";
  const ok = await writeStoryImage(week, event, image, name);
  return NextResponse.json({ ok }, { status: ok ? 200 : 503, headers: NO_STORE });
}
