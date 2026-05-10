"use client";

import { useState } from "react";
import { toBlob } from "html-to-image";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { trackEvent } from "@/lib/analytics";

export type PosterCaptureData = {
  locationLabel: string;
  location: string;
  tripYear: string;
  posterTone: string;
  photoUrls: Array<string | null>;
};

type SaveImageButtonProps = {
  fileUrl?: string | null;
  posterData?: PosterCaptureData | null;
  layoutSourceId?: string;
  fileName?: string;
  tripId?: string;
  shareId?: string | null;
  buttonLabel?: string;
  className?: string;
};

export function SaveImageButton({
  fileUrl,
  posterData,
  layoutSourceId,
  fileName = "color-hunt-poster.png",
  tripId,
  shareId = null,
  buttonLabel = "Save image",
  className = "button-primary w-full sm:w-auto",
}: SaveImageButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setCanvasLetterSpacing(context: CanvasRenderingContext2D, value: string) {
    const nextContext = context as CanvasRenderingContext2D & { letterSpacing?: string };
    nextContext.letterSpacing = value;
  }

  function buildRoundedRectPath(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ) {
    const nextRadius = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + nextRadius, y);
    context.lineTo(x + width - nextRadius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + nextRadius);
    context.lineTo(x + width, y + height - nextRadius);
    context.quadraticCurveTo(x + width, y + height, x + width - nextRadius, y + height);
    context.lineTo(x + nextRadius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - nextRadius);
    context.lineTo(x, y + nextRadius);
    context.quadraticCurveTo(x, y, x + nextRadius, y);
    context.closePath();
  }

  function wrapPosterTitle(title: string, maxLineLength = 15) {
    const words = title.trim().split(/\s+/).filter(Boolean);

    if (words.length <= 1) {
      return words;
    }

    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const nextLine = currentLine ? `${currentLine} ${word}` : word;

      if (nextLine.length <= maxLineLength || currentLine.length === 0) {
        currentLine = nextLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.slice(0, 2);
  }

  function getFittedTitleSize(
    context: CanvasRenderingContext2D,
    lines: string[],
    maxWidth: number,
    initialSize: number,
    minSize = 88,
  ) {
    let nextSize = initialSize;

    while (nextSize > minSize) {
      context.font = `600 ${nextSize}px "Cormorant Garamond", Georgia, serif`;
      const widestLine = Math.max(...lines.map((line) => context.measureText(line).width));

      if (widestLine <= maxWidth) {
        return nextSize;
      }

      nextSize -= 2;
    }

    return minSize;
  }

  async function loadPosterImage(sourceUrl: string) {
    const response = await fetch(sourceUrl, { cache: "force-cache" });

    if (!response.ok) {
      throw new Error("Couldn't fetch the poster photo.");
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    try {
      const image = new Image();
      image.decoding = "async";
      image.src = objectUrl;
      await image.decode();
      return image;
    } finally {
      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 2000);
    }
  }

  async function loadBlobImage(blob: Blob) {
    const objectUrl = URL.createObjectURL(blob);

    try {
      const image = new Image();
      image.decoding = "async";
      image.src = objectUrl;
      await image.decode();
      return image;
    } finally {
      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 2000);
    }
  }

  async function renderPosterBlob(data: PosterCaptureData) {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Couldn't prepare the poster canvas.");
    }

    if (document.fonts) {
      try {
        await document.fonts.ready;
      } catch {
        // Fonts can still fall back gracefully.
      }
    }

    if (layoutSourceId) {
      const sourceNode = document.getElementById(layoutSourceId);

      if (sourceNode) {
        const sourceRect = sourceNode.getBoundingClientRect();
        const scale = canvas.width / sourceRect.width;
        const backgroundBlob = await toBlob(sourceNode, {
          cacheBust: true,
          pixelRatio: scale,
          backgroundColor: "#faf6ef",
          filter: (node) => !(node instanceof HTMLImageElement),
        });

        if (backgroundBlob) {
          const backgroundImage = await loadBlobImage(backgroundBlob);
          context.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

          const tiles = Array.from(sourceNode.querySelectorAll(".poster-photo-tile"));
          const loadedImages = await Promise.all(
            data.photoUrls.map(async (sourceUrl) => {
              if (!sourceUrl) {
                return null;
              }

              try {
                return await loadPosterImage(sourceUrl);
              } catch {
                return null;
              }
            }),
          );

          tiles.forEach((tile, index) => {
            const image = loadedImages[index];

            if (!image) {
              return;
            }

            const tileRect = tile.getBoundingClientRect();
            const x = (tileRect.left - sourceRect.left) * scale;
            const y = (tileRect.top - sourceRect.top) * scale;
            const width = tileRect.width * scale;
            const height = tileRect.height * scale;
            const computedStyle = window.getComputedStyle(tile);
            const radius = Number.parseFloat(computedStyle.borderTopLeftRadius || "0") * scale;
            const drawScale = Math.max(width / image.width, height / image.height);
            const drawWidth = image.width * drawScale;
            const drawHeight = image.height * drawScale;
            const drawX = x + (width - drawWidth) / 2;
            const drawY = y + (height - drawHeight) / 2;

            context.save();
            buildRoundedRectPath(context, x, y, width, height, radius);
            context.clip();
            context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
            context.restore();
          });

          return await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error("Couldn't prepare the poster image."));
                return;
              }

              resolve(blob);
            }, "image/png");
          });
        }
      }
    }

    context.fillStyle = "#faf6ef";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const panelX = 18;
    const panelY = 18;
    const panelWidth = 1044;
    const panelHeight = 1314;
    buildRoundedRectPath(context, panelX, panelY, panelWidth, panelHeight, 10);
    context.fillStyle = "#fbf9f4";
    context.fill();
    context.strokeStyle = "rgba(94,126,152,0.12)";
    context.lineWidth = 1;
    context.stroke();

    const posterPadding = 40;
    const titleSize = 118;
    const titleLeading = 0.92;
    const metaSize = 20;
    const kickerSize = 12;
    const footerSize = 13;
    const footerTopPadding = 24;
    const gridTopMargin = 28;
    const gap = 16;
    const tileRadius = 6;
    const contentWidth = panelWidth - posterPadding * 2;
    const titleLines = wrapPosterTitle(data.locationLabel.toUpperCase());
    const fittedTitleSize = getFittedTitleSize(context, titleLines, contentWidth * 0.94, titleSize, 88);
    const titleLineHeight = Math.round(fittedTitleSize * titleLeading);
    const titleBlockHeight = Math.round(fittedTitleSize * 1.55);
    const metaBlockHeight = metaSize + 48;
    const footerBlockHeight = footerSize + footerTopPadding + 18;
    const availableGridHeight =
      panelHeight - posterPadding * 2 - 22 - titleBlockHeight - metaBlockHeight - gridTopMargin - footerBlockHeight;
    const gridHeight = Math.floor(availableGridHeight * 0.95);
    const tileHeight = Math.floor((gridHeight - gap * 2) / 3);
    const titleBaseY = panelY + posterPadding + fittedTitleSize;

    context.fillStyle = "rgba(32,26,23,0.6)";
    context.font = `600 ${kickerSize}px ui-sans-serif, system-ui, sans-serif`;
    context.textAlign = "left";
    setCanvasLetterSpacing(context, "0.16em");
    context.fillText("COLOR HUNT", panelX + posterPadding, panelY + 36);

    context.strokeStyle = "rgba(94,126,152,0.14)";
    context.beginPath();
    context.moveTo(panelX + posterPadding, panelY + 64);
    context.lineTo(panelX + panelWidth - posterPadding, panelY + 64);
    context.stroke();

    context.fillStyle = data.posterTone;
    context.font = `600 ${fittedTitleSize}px "Cormorant Garamond", Georgia, serif`;
    setCanvasLetterSpacing(context, "0px");
    titleLines.forEach((line, index) => {
      context.fillText(line, panelX + posterPadding, titleBaseY + index * titleLineHeight);
    });

    const metaY = panelY + posterPadding + titleBlockHeight + 42;
    context.strokeStyle = "rgba(90,120,150,0.16)";
    context.beginPath();
    context.moveTo(panelX + posterPadding, metaY - 18);
    context.lineTo(panelX + panelWidth - posterPadding, metaY - 18);
    context.stroke();

    context.fillStyle = "rgba(32,26,23,0.84)";
    context.font = `600 ${metaSize}px ui-sans-serif, system-ui, sans-serif`;
    setCanvasLetterSpacing(context, "0.08em");
    context.fillText("EXPLORING", panelX + posterPadding, metaY);

    context.fillStyle = "rgba(32,26,23,0.58)";
    context.font = `400 ${metaSize}px ui-sans-serif, system-ui, sans-serif`;
    setCanvasLetterSpacing(context, "0.08em");
    context.fillText(data.location.toUpperCase(), panelX + posterPadding + 198, metaY);

    context.fillStyle = "rgba(32,26,23,0.46)";
    context.font = `600 ${metaSize}px ui-sans-serif, system-ui, sans-serif`;
    setCanvasLetterSpacing(context, "0.08em");
    const locationMetrics = context.measureText(data.location.toUpperCase());
    context.fillText(data.tripYear, panelX + posterPadding + 198 + locationMetrics.width + 24, metaY);

    const gridTop = panelY + posterPadding + titleBlockHeight + metaBlockHeight + gridTopMargin;
    const tileWidth = Math.floor((contentWidth - gap * 2) / 3);

    const loadedImages = await Promise.all(
      data.photoUrls.map(async (sourceUrl) => {
        if (!sourceUrl) {
          return null;
        }

        try {
          return await loadPosterImage(sourceUrl);
        } catch {
          return null;
        }
      }),
    );

    loadedImages.forEach((image, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = panelX + posterPadding + column * (tileWidth + gap);
      const y = gridTop + row * (tileHeight + gap);

      buildRoundedRectPath(context, x, y, tileWidth, tileHeight, tileRadius);
      context.fillStyle = "rgba(255,255,255,0.42)";
      context.fill();
      context.strokeStyle = "rgba(137,171,191,0.12)";
      context.stroke();

      if (!image) {
        return;
      }

      const scale = Math.max(tileWidth / image.width, tileHeight / image.height);
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      const drawX = x + (tileWidth - drawWidth) / 2;
      const drawY = y + (tileHeight - drawHeight) / 2;

      context.save();
      buildRoundedRectPath(context, x, y, tileWidth, tileHeight, tileRadius);
      context.clip();
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      context.restore();
    });

    context.strokeStyle = "rgba(94,126,152,0.12)";
    context.beginPath();
    const footerRuleY = panelY + panelHeight - footerTopPadding - footerSize - 18;
    context.moveTo(panelX + posterPadding, footerRuleY);
    context.lineTo(panelX + panelWidth - posterPadding, footerRuleY);
    context.stroke();

    context.fillStyle = "rgba(74,116,148,0.56)";
    context.font = `600 ${footerSize}px ui-sans-serif, system-ui, sans-serif`;
    context.textAlign = "center";
    setCanvasLetterSpacing(context, "0.14em");
    context.fillText("ONE PLACE. ONE COLOR. NINE MOMENTS.", canvas.width / 2, footerRuleY + footerTopPadding + 8);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Couldn't prepare the poster image."));
          return;
        }

        resolve(blob);
      }, "image/png");
    });
  }

  async function openBlob(blob: Blob) {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    link.rel = "noreferrer";
    link.click();

    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 2000);
  }

  async function shareOrDownloadBlob(blob: Blob) {
    const shareFile = new File([blob], fileName, {
      type: blob.type || "image/png",
    });

    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [shareFile] })
    ) {
      await navigator.share({
        title: "Color Hunt poster",
        files: [shareFile],
      });
      return "shared";
    }

    await openBlob(blob);
    return "downloaded";
  }

  async function handleOpenImage() {
    setError(null);
    setIsPending(true);

    try {
      trackEvent({
        eventName: "poster_image_opened",
        tripId,
        shareId,
      });

      if (posterData) {
        const blob = await renderPosterBlob(posterData);
        const mode = await shareOrDownloadBlob(blob);
        trackEvent({
          eventName: mode === "shared" ? "poster_image_shared_native" : "poster_image_downloaded",
          tripId,
          shareId,
          metadata: {
            mode: "canvas_render",
          },
        });
        return;
      }

      if (!fileUrl) {
        setError("Your poster image is still being prepared.");
        return;
      }

      const response = await fetch(fileUrl);

      if (!response.ok) {
        throw new Error("Couldn't fetch the poster image.");
      }

      const blob = await response.blob();
      const mode = await shareOrDownloadBlob(blob);
      trackEvent({
        eventName: mode === "shared" ? "poster_image_shared_native" : "poster_image_downloaded",
        tripId,
        shareId,
        metadata: {
          mode: "cached_file",
        },
      });
    } catch (openFailure) {
      const message = openFailure instanceof Error ? openFailure.message : "Couldn't open the poster image.";
      trackEvent({
        eventName: "poster_image_open_failed",
        tripId,
        shareId,
        metadata: {
          message,
        },
      });
      setError(message);
    } finally {
      window.setTimeout(() => {
        setIsPending(false);
      }, 350);
    }
  }

  return (
    <>
      <button type="button" onClick={handleOpenImage} className={className} disabled={isPending}>
        {isPending ? "Preparing image..." : posterData || fileUrl ? buttonLabel : "Preparing poster..."}
      </button>
      <p className="mt-2 text-xs text-[var(--muted)]">
        {!posterData && !fileUrl
          ? "The main poster asset is still being prepared. Try again in a moment."
          : isPending
          ? "Preparing the poster image for your phone’s share and save options."
          : "Open your phone’s native save and share options for the poster."}
      </p>
      {error ? <FeedbackToast kind="error" message={error} onDismiss={() => setError(null)} /> : null}
    </>
  );
}
