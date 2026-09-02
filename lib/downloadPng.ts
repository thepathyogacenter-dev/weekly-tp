import { toPng } from "html-to-image";

export async function createPngBlob(
  node: HTMLElement,
  size: { width: number; height: number }
) {
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
