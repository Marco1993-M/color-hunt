import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

let ogFontsPromise: Promise<{ regular: ArrayBuffer; semibold: ArrayBuffer } | null> | null = null;

function toArrayBuffer(buffer: Buffer<ArrayBufferLike>) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export async function loadOgFonts() {
  if (!ogFontsPromise) {
    ogFontsPromise = (async () => {
      try {
        const regular = await readFile(join(process.cwd(), "public", "fonts", "CormorantGaramond-Regular.ttf"));
        const semibold = await readFile(join(process.cwd(), "public", "fonts", "CormorantGaramond-SemiBold.ttf"));

        return {
          regular: toArrayBuffer(regular),
          semibold: toArrayBuffer(semibold),
        };
      } catch {
        return null;
      }
    })();
  }

  return await ogFontsPromise;
}

export function buildOgPalette(accent?: string | null) {
  const color = accent?.trim() || "#2f61df";

  return {
    accent: color,
    background: "linear-gradient(135deg, #fff7ef 0%, #f6ecdf 50%, #f0e4d3 100%)",
    panel: "rgba(255,255,255,0.72)",
    border: "rgba(60,43,30,0.08)",
    text: "#2d2230",
    muted: "rgba(45,34,48,0.68)",
  };
}

export async function createOgImageResponse(element: React.ReactElement) {
  const fonts = await loadOgFonts();

  return new ImageResponse(element, {
    width: 1200,
    height: 630,
    fonts: fonts
      ? [
          {
            name: "Cormorant Garamond",
            data: fonts.regular,
            style: "normal",
            weight: 400,
          },
          {
            name: "Cormorant Garamond",
            data: fonts.semibold,
            style: "normal",
            weight: 600,
          },
        ]
      : [],
  });
}
