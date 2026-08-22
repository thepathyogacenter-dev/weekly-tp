"use client";

import { useState } from "react";

const STORIES = [
  "Applied Neuro Yoga Teacher Training - Story-1.png",
  "Applied Neuro Yoga Teacher Training - Story.png",
  "IG Story - BW Training 2027.png",
  "IG Story - BW Training 2028.png",
  "IG Story - BW Training 2029.png",
  "IG Story - Sound Healing 30 Hour 2027.png",
  "IG Story - Sound Healing 30 Hour 2028.png",
  "IG Story - Sound Healing 30 Hour 2029.png",
  "IG Story - YTT 200 Hour 2029.png",
  "IG Story - YTT 200 Hour 2030.png",
  "IG Story - YTT 200 Hour 2031.png",
  "IG Story - Yin Fascia 60 Hour 2027.png",
  "IG Story - Yin Fascia 60 Hour 2028.png",
  "IG Story - Yin Fascia 60 Hour 2029.png",
  "IG Story - Yin Fascia 60 Hour 2030.png",
  "IG Story - Yin TT 60 Hour 2027.png",
  "IG Story - Yin TT 60 Hour 2028.png",
  "IG Story - Yin TT 60 Hour 2029.png",
] as const;

function displayName(filename: string) {
  return filename.replace(/^IG Story - /, "").replace(/ - Story(?:-1)?/, "").replace(/\.png$/, "");
}

export function StoryLibrary() {
  const [sharing, setSharing] = useState<string | null>(null);

  const share = async (filename: string) => {
    setSharing(filename);
    try {
      const response = await fetch(`/stories/${encodeURIComponent(filename)}`);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: displayName(filename) });
      } else {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
      }
    } finally {
      setSharing(null);
    }
  };

  return (
    <section className="story-library" aria-labelledby="story-library-title">
      <header>
        <p className="stories-panel-label">Always available</p>
        <h2 id="story-library-title">Story library</h2>
        <p>Reusable training stories saved in the admin. Download them or share directly to Instagram whenever you need them.</p>
      </header>
      <div className="story-library-grid">
        {STORIES.map((filename) => {
          const src = `/stories/${encodeURIComponent(filename)}`;
          return (
            <article className="story-library-card" key={filename}>
              <img src={src} alt={displayName(filename)} />
              <h3>{displayName(filename)}</h3>
              <div>
                <a href={src} download={filename}>Download</a>
                <button type="button" onClick={() => share(filename)} disabled={sharing === filename}>{sharing === filename ? "Preparing…" : "Share"}</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
