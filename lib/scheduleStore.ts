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

export async function readStoryImage(weekKey: string, eventId: string): Promise<string | null> {
  if (!overridesConfigured()) return null;
  try {
    const { kv } = await import("@vercel/kv");
    return await kv.get<string>(`${STORY_IMAGE_PREFIX}${weekKey}:${eventId}`);
  } catch {
    return null;
  }
}

export async function writeStoryImage(weekKey: string, eventId: string, image: string): Promise<boolean> {
  if (!overridesConfigured()) return false;
  try {
    const { kv } = await import("@vercel/kv");
    await kv.set(`${STORY_IMAGE_PREFIX}${weekKey}:${eventId}`, image);
    return true;
  } catch {
    return false;
  }
}
