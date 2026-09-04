import type { CarouselPhotoItem } from "./types";
import { overridesConfigured } from "./scheduleStore";

const KEY = "carousel-photo-library";

export async function readCarouselPhotoLibrary(): Promise<CarouselPhotoItem[]> {
  if (!overridesConfigured()) return [];
  try { const { kv } = await import("@vercel/kv"); const photos = await kv.get<CarouselPhotoItem[]>(KEY); return Array.isArray(photos) ? photos : []; } catch { return []; }
}

export async function addCarouselPhoto(item: CarouselPhotoItem): Promise<boolean> {
  if (!overridesConfigured()) return false;
  try { const { kv } = await import("@vercel/kv"); await kv.set(KEY, [item, ...(await readCarouselPhotoLibrary())]); return true; } catch { return false; }
}

export async function deleteCarouselPhoto(id: string): Promise<boolean> {
  if (!overridesConfigured()) return false;
  try { const { kv } = await import("@vercel/kv"); await kv.set(KEY, (await readCarouselPhotoLibrary()).filter((photo) => photo.id !== id)); return true; } catch { return false; }
}
