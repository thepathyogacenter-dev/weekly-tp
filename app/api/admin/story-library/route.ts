import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, validAdminSession } from "@/lib/adminAuth";
import { addStoryLibraryItem, deleteStoryLibraryItem, readStoryLibrary, updateStoryLibraryItem } from "@/lib/storyLibraryStore";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

async function isAdmin() { return validAdminSession((await cookies()).get(ADMIN_COOKIE)?.value); }
function text(value: unknown, limit: number) { return typeof value === "string" ? value.trim().slice(0, limit) : ""; }
function validImage(value: unknown) { return typeof value === "string" && /^data:image\/jpeg;base64,/.test(value) && value.length <= 650_000; }

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  return NextResponse.json({ items: await readStoryLibrary() }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  const body = await request.json().catch(() => null); const title = text(body?.title, 100); const category = text(body?.category, 80); const image = body?.image;
  if (!title || !category || !validImage(image)) return NextResponse.json({ error: "Use a training name, title, and compatible image." }, { status: 400, headers: NO_STORE });
  const item = { id: crypto.randomUUID(), title, category, image }; const ok = await addStoryLibraryItem(item);
  return NextResponse.json({ ok, item: ok ? item : null }, { status: ok ? 200 : 503, headers: NO_STORE });
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  const body = await request.json().catch(() => null); const id = text(body?.id, 200); const title = text(body?.title, 100); const category = text(body?.category, 80); const image = body?.image;
  if (!id || !title || !category || (image !== undefined && !validImage(image))) return NextResponse.json({ error: "Invalid design update." }, { status: 400, headers: NO_STORE });
  const item = { id, title, category, ...(image ? { image } : {}) }; const ok = await updateStoryLibraryItem(item);
  return NextResponse.json({ ok, item: ok ? item : null }, { status: ok ? 200 : 503, headers: NO_STORE });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  const body = await request.json().catch(() => null); const id = text(body?.id, 200);
  if (!id) return NextResponse.json({ error: "Invalid design." }, { status: 400, headers: NO_STORE });
  const ok = await deleteStoryLibraryItem(id, body?.bundled === true);
  return NextResponse.json({ ok }, { status: ok ? 200 : 503, headers: NO_STORE });
}
