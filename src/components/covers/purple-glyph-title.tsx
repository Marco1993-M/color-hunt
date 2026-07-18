"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { getCoverDisplayTitle, maxCustomCoverTitleLength, maxCustomCoverTitleLineLength } from "@/lib/covers";

type PurpleGlyphTitleProps = {
  title: string | null | undefined;
  stacked?: boolean;
};

type Glyph = {
  src: string;
  ratio: number;
};

const glyphCache = new Map<string, Promise<Glyph | null>>();

function getGlyphPath(character: string) {
  return `/Font%20Family/Purple/${encodeURIComponent(character)}.png`;
}

async function loadGlyph(character: string): Promise<Glyph | null> {
  if (!/^[A-Z0-9]$/.test(character)) {
    return null;
  }

  const cached = glyphCache.get(character);
  if (cached) {
    return cached;
  }

  const glyphPromise = new Promise<Glyph | null>((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      // The source glyphs are print-sized. Downsample before inspecting alpha so a short title stays light on mobile.
      const scale = Math.min(1, 640 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (!context) {
        resolve(null);
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let left = canvas.width;
      let top = canvas.height;
      let right = -1;
      let bottom = -1;

      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          if (pixels[(y * canvas.width + x) * 4 + 3] > 8) {
            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x);
            bottom = Math.max(bottom, y);
          }
        }
      }

      if (right < left || bottom < top) {
        resolve(null);
        return;
      }

      const padding = Math.round(Math.max(right - left, bottom - top) * 0.035);
      left = Math.max(0, left - padding);
      top = Math.max(0, top - padding);
      right = Math.min(canvas.width - 1, right + padding);
      bottom = Math.min(canvas.height - 1, bottom + padding);

      const width = right - left + 1;
      const height = bottom - top + 1;
      const croppedCanvas = document.createElement("canvas");
      croppedCanvas.width = width;
      croppedCanvas.height = height;
      croppedCanvas.getContext("2d")?.drawImage(canvas, left, top, width, height, 0, 0, width, height);
      resolve({ src: croppedCanvas.toDataURL("image/png"), ratio: width / height });
    };
    image.onerror = () => resolve(null);
    image.src = getGlyphPath(character);
  });

  glyphCache.set(character, glyphPromise);
  return glyphPromise;
}

export function PurpleGlyphTitle({ title, stacked = false }: PurpleGlyphTitleProps) {
  const displayLines = stacked
    ? String(title || "").split("\n").slice(0, 2).map((line) => getCoverDisplayTitle(line).slice(0, maxCustomCoverTitleLineLength))
    : [getCoverDisplayTitle(title).slice(0, maxCustomCoverTitleLength)];
  const glyphCharacters = Array.from(new Set(displayLines.join("").replace(/\s/g, "").split("")));
  const [glyphs, setGlyphs] = useState<Record<string, Glyph | null>>({});

  useEffect(() => {
    let cancelled = false;

    Promise.all(glyphCharacters.map(async (character) => [character, await loadGlyph(character)] as const)).then((entries) => {
      if (!cancelled) {
        setGlyphs(Object.fromEntries(entries));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [glyphCharacters.join("")]);

  return (
    <div className={`purple-glyph-title ${stacked ? "is-stacked" : ""}`} aria-label={title || "Cover title"}>
      {displayLines.map((displayTitle, lineIndex) => <div key={`${displayTitle}-${lineIndex}`} className="purple-glyph-title-line" style={{ "--purple-glyph-count": displayTitle.length } as CSSProperties & Record<"--purple-glyph-count", number>}>
        {Array.from(displayTitle).map((character, characterIndex) => {
          if (character === " ") {
            return <span className="purple-glyph-title-space" key={`${characterIndex}-space`} />;
          }

          const glyph = glyphs[character];
          return glyph ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="purple-glyph-title-letter" key={`${character}-${characterIndex}`} src={glyph.src} alt="" />
          ) : (
            <span className="purple-glyph-title-fallback" key={`${character}-${characterIndex}`}>
              {character}
            </span>
          );
        })}
      </div>)}
    </div>
  );
}
