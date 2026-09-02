"use client";

import { useEffect, useState } from "react";
import type { StoryLibraryItem } from "@/lib/types";

const STORIES = [
  "Applied Neuro Yoga Teacher Training - Story-1.png", "Applied Neuro Yoga Teacher Training - Story.png",
  "IG Story - BW Training 2027.png", "IG Story - BW Training 2028.png", "IG Story - BW Training 2029.png",
  "IG Story - Sound Healing 30 Hour 2027.png", "IG Story - Sound Healing 30 Hour 2028.png", "IG Story - Sound Healing 30 Hour 2029.png",
  "IG Story - YTT 200 Hour 2029.png", "IG Story - YTT 200 Hour 2030.png", "IG Story - YTT 200 Hour 2031.png",
  "IG Story - Yin Fascia 60 Hour 2027.png", "IG Story - Yin Fascia 60 Hour 2028.png", "IG Story - Yin Fascia 60 Hour 2029.png", "IG Story - Yin Fascia 60 Hour 2030.png",
  "IG Story - Yin TT 60 Hour 2027.png", "IG Story - Yin TT 60 Hour 2028.png", "IG Story - Yin TT 60 Hour 2029.png",
] as const;

type LibraryEntry = { id: string; title: string; src: string; filename: string };
const STATIC_IDS = new Set<string>(STORIES);

function displayName(filename: string) { return filename.replace(/^IG Story - /, "").replace(/ - Story(?:-1)?/, "").replace(/\.png$/, ""); }
function fileName(title: string) { return (title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "story") + ".jpg"; }

async function prepareImage(file: File) {
  const sourceUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Could not read image")); reader.readAsDataURL(file); });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => { const element = new Image(); element.onload = () => resolve(element); element.onerror = () => reject(new Error("Could not prepare image")); element.src = sourceUrl; });
  const ratio = Math.min(1, 1080 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas"); canvas.width = Math.round(image.naturalWidth * ratio); canvas.height = Math.round(image.naturalHeight * ratio);
  const context = canvas.getContext("2d"); if (!context) throw new Error("Could not prepare image");
  context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let quality = 0.84; let result = canvas.toDataURL("image/jpeg", quality);
  while (result.length > 600_000 && quality > 0.5) { quality -= 0.08; result = canvas.toDataURL("image/jpeg", quality); }
  return result;
}

export function StoryLibrary() {
  const [sharing, setSharing] = useState<string | null>(null);
  const [items, setItems] = useState<StoryLibraryItem[]>([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "error">("idle");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingState, setEditingState] = useState<"idle" | "saving" | "error">("idle");

  useEffect(() => { fetch("/api/admin/story-library", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((result) => setItems(Array.isArray(result?.items) ? result.items : [])).catch(() => undefined); }, []);

  const entries: LibraryEntry[] = [
    ...items.filter((item) => !STATIC_IDS.has(item.id) && item.image).map((item) => ({ id: item.id, title: item.title, src: item.image as string, filename: fileName(item.title) })),
    ...STORIES.map((filename) => {
      const saved = items.find((item) => item.id === filename);
      return { id: filename, title: saved?.title || displayName(filename), src: saved?.image || "/stories/" + encodeURIComponent(filename), filename: saved?.image ? fileName(saved.title) : filename };
    }),
  ];
  const share = async (entry: LibraryEntry) => {
    setSharing(entry.id);
    try {
      const blob = await (await fetch(entry.src)).blob(); const storyFile = new File([blob], entry.filename, { type: blob.type || "image/png" });
      const supportsFileShare = typeof navigator.canShare === "function" && navigator.canShare({ files: [storyFile] });
      if (supportsFileShare && typeof navigator.share === "function") await navigator.share({ files: [storyFile], title: entry.title });
      else { const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = entry.filename; link.click(); window.setTimeout(() => URL.revokeObjectURL(link.href), 1_000); }
    } finally { setSharing(null); }
  };
  const startEditing = (entry: LibraryEntry) => { setEditingId(entry.id); setEditingTitle(entry.title); setEditingState("idle"); };
  const saveEdit = async (entry: LibraryEntry, replacement?: File) => {
    const nextTitle = editingTitle.trim() || entry.title;
    setEditingState("saving");
    try {
      const image = replacement ? await prepareImage(replacement) : undefined;
      const response = await fetch("/api/admin/story-library", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: entry.id, title: nextTitle, image }) });
      const result = await response.json().catch(() => null); if (!response.ok || !result?.item) throw new Error("Save failed");
      setItems((current) => { const index = current.findIndex((item) => item.id === entry.id); return index === -1 ? [result.item, ...current] : current.map((item) => item.id === entry.id ? { ...item, ...result.item } : item); });
      setEditingId(null); setEditingState("idle");
    } catch { setEditingState("error"); }
  };

  const upload = async (event: React.FormEvent) => {
    event.preventDefault(); if (!file || !title.trim()) return; setUploadState("uploading");
    try {
      const image = await prepareImage(file);
      const response = await fetch("/api/admin/story-library", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, image }) });
      const result = await response.json().catch(() => null); if (!response.ok || !result?.item) throw new Error("Upload failed");
      setItems((current) => [result.item, ...current]); setTitle(""); setFile(null); setUploadState("idle");
    } catch { setUploadState("error"); }
  };

  return <section className="story-library" aria-labelledby="story-library-title">
    <header><p className="stories-panel-label">Always available</p><h2 id="story-library-title">Story library</h2><p>Reusable training and Instagram stories. Add a new approved design once, then every admin can download or share it.</p></header>
    <form className="story-library-upload" onSubmit={upload}>
      <label><span>Design title</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. 200 Hour Training 2032" required /></label>
      <label><span>Story design</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required /></label>
      <button type="submit" disabled={uploadState === "uploading"}>{uploadState === "uploading" ? "Adding…" : "Add to library"}</button>
      {uploadState === "error" && <p role="status">Could not add this image. Try a different image file.</p>}
    </form>
    <div className="story-library-grid">{entries.map((entry) => <article className="story-library-card" key={entry.id}>
      <img src={entry.src} alt={entry.title} />
      <h3 contentEditable={editingId === entry.id} suppressContentEditableWarning onInput={(event) => editingId === entry.id && setEditingTitle(event.currentTarget.textContent || "")}>{entry.title}</h3>
      {editingId === entry.id ? <div className="story-library-card-edit"><label>Replace image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => saveEdit(entry, event.target.files?.[0])} /></label><button type="button" onClick={() => saveEdit(entry)} disabled={editingState === "saving"}>{editingState === "saving" ? "Saving…" : "Save name"}</button><button type="button" onClick={() => setEditingId(null)}>Cancel</button>{editingState === "error" && <p>Could not save. Try again.</p>}</div> : <div><a href={entry.src} download={entry.filename}>Download</a><button type="button" onClick={() => share(entry)} disabled={sharing === entry.id}>{sharing === entry.id ? "Preparing…" : "Share"}</button><button type="button" onClick={() => startEditing(entry)}>Edit</button></div>}
    </article>)}</div>
  </section>;
}
