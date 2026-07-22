import { toPng } from "html-to-image";

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
  const dataUrl = await toPng(node, {
    width: size.width,
    height: size.height,
    pixelRatio: 2,
    cacheBust: true,
    style: {
      transform: "none",
      width: `${size.width}px`,
      height: `${size.height}px`,
    },
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
