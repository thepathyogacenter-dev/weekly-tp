"use client";

import { useState } from "react";
import { downloadPng } from "@/lib/downloadPng";

type CarouselItem = { canvasId: string; filename: string };

export function CarouselDownloadButton({ items }: { items: CarouselItem[] }) {
  const [busy, setBusy] = useState(false);

  const downloadAll = async () => {
    setBusy(true);
    try {
      for (const item of items) {
        const node = document.getElementById(item.canvasId);
        if (!node) continue;
        await downloadPng(node, item.filename, { width: 1080, height: 1350 });
      }
    } finally {
      setBusy(false);
    }
  };

  return <button className="carousel-download-all" type="button" onClick={downloadAll} disabled={busy}>{busy ? "Preparing…" : "Download all carousel posts"}</button>;
}
