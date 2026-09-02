import { toPng } from "html-to-image";

async function toDataUrl(url: string) {
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) throw new Error("Image unavailable");
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not embed image"));
    reader.readAsDataURL(blob);
  });
}

// WebKit can omit normal image URLs when a DOM node is captured through SVG
// foreignObject. Embed those photos first, then restore the live preview.
async function embedImagesForCapture(node: HTMLElement) {
  const images = Array.from(node.querySelectorAll<HTMLImageElement>("img"));
  const originals = images.map((image) => ({ image, src: image.getAttribute("src") || "" }));
  await Promise.all(originals.map(async ({ image, src }) => {
    if (!src || src.startsWith("data:")) return;
    try {
      image.src = await toDataUrl(image.currentSrc || src);
      if (typeof image.decode === "function") await image.decode().catch(() => undefined);
    } catch {
      // Keep the original source if a decorative asset cannot be embedded.
    }
  }));
  return () => originals.forEach(({ image, src }) => image.setAttribute("src", src));
}

export async function createPngBlob(
  node: HTMLElement,
  size: { width: number; height: number }
) {
  const restoreImages = await embedImagesForCapture(node);
  try {
    const options = {
      width: size.width,
      height: size.height,
      pixelRatio: 2,
      cacheBust: true,
      style: {
        transform: "none",
        width: `${size.width}px`,
        height: `${size.height}px`,
      },
    };
    // WebKit may return a blank first foreignObject render. Warming it once
    // makes Safari exports match the on-screen canvas.
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
    if (isSafari) await toPng(node, options);
    const dataUrl = await toPng(node, options);
    return await (await fetch(dataUrl)).blob();
  } finally {
    restoreImages();
  }
}

/**
 * The node is displayed shrunk down (CSS transform: scale(...)) for on-page
 * preview, but must export at its true intrinsic size — so the capture
 * clone gets its transform reset to identity via html-to-image's `style` override.
 */
export async function downloadPng(
  node: HTMLElement,
  filename: string,
  size: { width: number; height: number }
) {
  const blob = await createPngBlob(node, size);
  const link = document.createElement("a");
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  link.click();
  // Safari can cancel a download if its object URL is released in the same task.
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1_000);
}
