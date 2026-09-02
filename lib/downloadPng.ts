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

async function canvasToBlob(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (blob) return blob;
  return await (await fetch(canvas.toDataURL("image/png"))).blob();
}

async function createSafariPng(node: HTMLElement, size: { width: number; height: number }) {
  const { default: html2canvas } = await import("html2canvas");
  // The visible story sits inside a CSS-scaled preview. Safari's canvas
  // renderer reads that transformed size, so capture a full-size off-screen
  // clone instead of the preview itself.
  const clone = node.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.style.cssText += `;position:fixed;left:-12000px;top:0;width:${size.width}px;height:${size.height}px;transform:none;transform-origin:top left;`;
  document.body.appendChild(clone);
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    const canvas = await html2canvas(clone, {
      backgroundColor: null,
      width: size.width,
      height: size.height,
      scale: 1,
      useCORS: true,
      allowTaint: false,
      logging: false,
      windowWidth: size.width,
      windowHeight: size.height,
    });
    return canvasToBlob(canvas);
  } finally {
    clone.remove();
  }
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
    // Safari has recurring image-loss bugs with SVG foreignObject. Render its
    // actual DOM through Canvas instead; the rest of the browsers keep the
    // sharper SVG export path.
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
    if (isSafari) {
      try {
        return await createSafariPng(node, size);
      } catch {
        // Fall through to the existing renderer if an older Safari rejects a CSS feature.
      }
    }
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
