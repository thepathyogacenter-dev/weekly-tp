import type { StoryLibraryItem } from "./types";
import { overridesConfigured } from "./scheduleStore";

const KEY = "story-library";

export async function readStoryLibrary(): Promise<StoryLibraryItem[]> {
  if (!overridesConfigured()) return [];
  try {
    const { kv } = await import("@vercel/kv");
    const items = await kv.get<StoryLibraryItem[]>(KEY);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export async function addStoryLibraryItem(item: StoryLibraryItem): Promise<boolean> {
  if (!overridesConfigured()) return false;
  try {
    const { kv } = await import("@vercel/kv");
    const current = await readStoryLibrary();
    await kv.set(KEY, [item, ...current]);
    return true;
  } catch {
    return false;
  }
}
