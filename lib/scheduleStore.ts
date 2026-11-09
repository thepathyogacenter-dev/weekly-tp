import type { ClassItem, SharedStoryDesign } from "./types";

// Server-side store for admin schedule overrides, keyed by the week's Monday
// (YYYY-MM-DD). Uses Vercel KV so every device shares the same live edits.
// When KV isn't configured (e.g. local dev without env vars) the helpers no-op
// and callers fall back to per-browser localStorage.

const PREFIX = "schedule-overrides:";
const DESIGN_PREFIX = "story-design:";
const STORY_IMAGE_PREFIX = "story-image:";
const OVERRIDE_VERSION = 2;

type StoredOverride = {
  version: typeof OVERRIDE_VERSION;
  classes: ClassItem[];
};

export function overridesConfigured(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export async function readOverrides(weekKey: string): Promise<ClassItem[] | null> {
  if (!overridesConfigured()) return null;
  try {
    const { kv } = await import("@vercel/kv");
    const stored = await kv.get<StoredOverride | ClassItem[]>(`${PREFIX}${weekKey}`);
    // Version 1 stored a complete generated schedule, so it can keep stale
    // Momence classes alive. Ignore it; all new shared edits use version 2.
    return stored && !Array.isArray(stored) && stored.version === OVERRIDE_VERSION && Array.isArray(stored.classes)
      ? stored.classes
      : null;
  } catch {
    return null;
  }
}

export async function writeOverrides(weekKey: string, classes: ClassItem[]): Promise<boolean> {
  if (!overridesConfigured()) return false;
  try {
    const { kv } = await import("@vercel/kv");
    await kv.set<StoredOverride>(`${PREFIX}${weekKey}`, { version: OVERRIDE_VERSION, classes });
    return true;
  } catch {
    return false;
  }
}

export async function clearOverrides(weekKey: string): Promise<boolean> {
  if (!overridesConfigured()) return false;
  try {
    const { kv } = await import("@vercel/kv");
    await kv.del(`${PREFIX}${weekKey}`);
    return true;
  } catch {
    return false;
  }
}

// A separate, small shared record for editable story canvas details. Keeping it
// apart from the class override prevents a title/crop adjustment overwriting a
// schedule edit made by another admin.
export async function readStoryDesign(weekKey: string): Promise<SharedStoryDesign> {
  if (!overridesConfigured()) return {};
  try {
    const { kv } = await import("@vercel/kv");
    return (await kv.get<SharedStoryDesign>(`${DESIGN_PREFIX}${weekKey}`)) ?? {};
  } catch {
    return {};
  }
}

export async function writeStoryDesign(weekKey: string, design: SharedStoryDesign): Promise<boolean> {
  if (!overridesConfigured()) return false;
  try {
    const { kv } = await import("@vercel/kv");
    await kv.set(`${DESIGN_PREFIX}${weekKey}`, design);
    return true;
  } catch {
    return false;
  }
}

// Foto terakhir per nama event, dipakai ulang otomatis di minggu-minggu berikutnya.
const STORY_IMAGE_NAME_PREFIX = "story-image-name:";

function eventNameKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Urutan: foto khusus minggu ini → foto terakhir untuk nama event yang sama → null (default). */
export async function readStoryImage(weekKey: string, eventId: string, eventName?: string): Promise<string | null> {
  if (!overridesConfigured()) return null;
  try {
    const { kv } = await import("@vercel/kv");
    const nameKey = eventName ? eventNameKey(eventName) : "";
    const weekly = await kv.get<string>(`${STORY_IMAGE_PREFIX}${weekKey}:${eventId}`);
    if (weekly) {
      // Foto lama (sebelum fitur ini) ikut diingat, tanpa menimpa yang sudah ada.
      if (nameKey) await kv.set(`${STORY_IMAGE_NAME_PREFIX}${nameKey}`, weekly, { nx: true }).catch(() => null);
      return weekly;
    }
    return nameKey ? await kv.get<string>(`${STORY_IMAGE_NAME_PREFIX}${nameKey}`) : null;
  } catch {
    return null;
  }
}

export async function writeStoryImage(weekKey: string, eventId: string, image: string, eventName?: string): Promise<boolean> {
  if (!overridesConfigured()) return false;
  try {
    const { kv } = await import("@vercel/kv");
    const nameKey = eventName ? eventNameKey(eventName) : "";
    await Promise.all([
      kv.set(`${STORY_IMAGE_PREFIX}${weekKey}:${eventId}`, image),
      nameKey ? kv.set(`${STORY_IMAGE_NAME_PREFIX}${nameKey}`, image) : Promise.resolve(),
    ]);
    return true;
  } catch {
    return false;
  }
}
