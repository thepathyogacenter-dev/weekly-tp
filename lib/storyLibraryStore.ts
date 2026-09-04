import type { StoryLibraryItem } from "./types";
import { overridesConfigured } from "./scheduleStore";

const KEY = "story-library";

export async function readStoryLibrary(): Promise<StoryLibraryItem[]> {
  if (!overridesConfigured()) return [];
  try {
    const { kv } = await import("@vercel/kv");
    const items = await kv.get<StoryLibraryItem[]>(KEY);
    return Array.isArray(items) ? items : [];
  } catch { return []; }
}

async function writeStoryLibrary(items: StoryLibraryItem[]): Promise<boolean> {
  if (!overridesConfigured()) return false;
  try { const { kv } = await import("@vercel/kv"); await kv.set(KEY, items); return true; } catch { return false; }
}

export async function addStoryLibraryItem(item: StoryLibraryItem): Promise<boolean> {
  return writeStoryLibrary([item, ...(await readStoryLibrary())]);
}

export async function updateStoryLibraryItem(item: StoryLibraryItem): Promise<boolean> {
  const current = await readStoryLibrary();
  const exists = current.some((entry) => entry.id === item.id);
  return writeStoryLibrary(exists ? current.map((entry) => entry.id === item.id ? { ...entry, ...item } : entry) : [item, ...current]);
}

export async function deleteStoryLibraryItem(id: string, keepPlaceholder: boolean): Promise<boolean> {
  const current = await readStoryLibrary();
  const existing = current.find((item) => item.id === id);
  const remaining = current.filter((item) => item.id !== id);
  return writeStoryLibrary(keepPlaceholder ? [...remaining, { id, title: existing?.title ?? "", category: existing?.category, deleted: true }] : remaining);
}
