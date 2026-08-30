import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, validAdminSession } from "@/lib/adminAuth";
import { addStoryLibraryItem, readStoryLibrary } from "@/lib/storyLibraryStore";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

async function isAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return validAdminSession(token);
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  return NextResponse.json({ items: await readStoryLibrary() }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 100) : "";
  const image = typeof body?.image === "string" ? body.image : "";
  if (!title || !/^data:image\/jpeg;base64,/.test(image) || image.length > 650_000) {
    return NextResponse.json({ error: "Use a title and a compatible image." }, { status: 400, headers: NO_STORE });
  }
  const item = { id: crypto.randomUUID(), title, image };
  const ok = await addStoryLibraryItem(item);
  return NextResponse.json({ ok, item: ok ? item : null }, { status: ok ? 200 : 503, headers: NO_STORE });
}
