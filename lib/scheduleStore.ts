import type { ClassItem } from "./types";

// Server-side store for admin schedule overrides, keyed by the week's Monday
// (YYYY-MM-DD). Uses Vercel KV so every device shares the same live edits.
// When KV isn't configured (e.g. local dev without env vars) the helpers no-op
// and callers fall back to per-browser localStorage.

const PREFIX = "schedule-overrides:";

export function overridesConfigured(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export async function readOverrides(weekKey: string): Promise<ClassItem[] | null> {
  if (!overridesConfigured()) return null;
  try {
    const { kv } = await import("@vercel/kv");
    return (await kv.get<ClassItem[]>(`${PREFIX}${weekKey}`)) ?? null;
  } catch {
    return null;
  }
}

export async function writeOverrides(weekKey: string, classes: ClassItem[]): Promise<boolean> {
  if (!overridesConfigured()) return false;
  try {
    const { kv } = await import("@vercel/kv");
    await kv.set(`${PREFIX}${weekKey}`, classes);
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
