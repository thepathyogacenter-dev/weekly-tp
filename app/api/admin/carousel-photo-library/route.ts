import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, validAdminSession } from "@/lib/adminAuth";
import { addCarouselPhoto, deleteCarouselPhoto, readCarouselPhotoLibrary } from "@/lib/carouselPhotoLibraryStore";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };
async function isAdmin() { return validAdminSession((await cookies()).get(ADMIN_COOKIE)?.value); }

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  return NextResponse.json({ photos: await readCarouselPhotoLibrary() }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 80) : "";
  const image = typeof body?.image === "string" ? body.image : "";
  if (!name || !/^data:image\/jpeg;base64,/.test(image) || image.length > 650_000) return NextResponse.json({ error: "Use a name and compatible image." }, { status: 400, headers: NO_STORE });
  const photo = { id: crypto.randomUUID(), name, image };
  const ok = await addCarouselPhoto(photo);
  return NextResponse.json({ ok, photo: ok ? photo : null }, { status: ok ? 200 : 503, headers: NO_STORE });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id.slice(0, 200) : "";
  if (!id) return NextResponse.json({ error: "Invalid photo." }, { status: 400, headers: NO_STORE });
  const ok = await deleteCarouselPhoto(id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 503, headers: NO_STORE });
}
