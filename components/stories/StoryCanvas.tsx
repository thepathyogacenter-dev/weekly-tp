"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { downloadPng } from "@/lib/downloadPng";

const W = 1080;
const H = 1920;

export function StoryCanvas({
  filename,
  label,
  children,
}: {
  filename: string;
  label: string;
  children: ReactNode;
}) {
  const sizerRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.24);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const el = sizerRef.current?.parentElement;
    if (!el) return;
    const compute = () => setScale(Math.min(el.clientWidth / W, 0.42));
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onDownload = async () => {
    if (!nodeRef.current) return;
    setBusy(true);
    try {
      await downloadPng(nodeRef.current, filename, { width: W, height: H });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="story-canvas">
      <div className="story-canvas-sizer" ref={sizerRef} style={{ "--story-scale": scale } as React.CSSProperties}>
        <div className="story-canvas-frame" style={{ "--story-scale": scale } as React.CSSProperties}>
          <div className="story-node" ref={nodeRef}>
            {children}
          </div>
        </div>
      </div>
      <button type="button" className="story-download" onClick={onDownload} disabled={busy}>
        {busy ? "Preparing…" : `Download ${label}`}
      </button>
    </div>
  );
}
