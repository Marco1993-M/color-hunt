"use client";

import { toBlob } from "html-to-image";
import { getPosterExportFormat, type PosterExportFormatId } from "@/lib/poster-export";

export type PosterCaptureData = {
  locationLabel: string;
  location: string;
  tripYear: string;
  posterTone: string;
  photoUrls: Array<string | null>;
};

type ManualLayout = {
  canvasPaddingX: number;
  canvasPaddingY: number;
  posterPadding: number;
  titleSize: number;
  titleLeading: number;
  metaSize: number;
  kickerSize: number;
  footerSize: number;
  footerTopPadding: number;
  gridTopMargin: number;
  gap: number;
  radius: number;
  tileRadius: number;
  gridHeightScale: number;
  columns: number;
  tileAspectRatio: number;
};

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

function getManualLayout(formatId: PosterExportFormatId): ManualLayout {
  switch (formatId) {
    case "story":
      return {
        canvasPaddingX: 36,
        canvasPaddingY: 44,
        posterPadding: 92,
        titleSize: 210,
        titleLeading: 0.89,
        metaSize: 35,
        kickerSize: 21,
        footerSize: 24,
        footerTopPadding: 40,
        gridTopMargin: 72,
        gap: 12,
        radius: 4,
        tileRadius: 2,
        gridHeightScale: 1,
        columns: 3,
        tileAspectRatio: 5 / 4,
      };
    case "square":
      return {
        canvasPaddingX: 30,
        canvasPaddingY: 30,
        posterPadding: 82,
        titleSize: 156,
        titleLeading: 0.9,
        metaSize: 27,
        kickerSize: 17,
        footerSize: 19,
        footerTopPadding: 34,
        gridTopMargin: 48,
        gap: 20,
        radius: 4,
        tileRadius: 2,
        gridHeightScale: 0.9,
        columns: 3,
        tileAspectRatio: 1,
      };
    default:
      return {
        canvasPaddingX: 18,
        canvasPaddingY: 18,
        posterPadding: 40,
        titleSize: 118,
        titleLeading: 0.92,
        metaSize: 20,
        kickerSize: 12,
        footerSize: 13,
        footerTopPadding: 24,
        gridTopMargin: 28,
        gap: 16,
        radius: 3,
        tileRadius: 1,
        gridHeightScale: 0.95,
        columns: 3,
        tileAspectRatio: 1,
      };
  }
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

async function ensureFontsReady() {
  if (document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // Fonts can still fall back gracefully.
    }
  }
}

async function renderPostFromLiveLayout({
  data,
  layoutSourceId,
}: {
  data: PosterCaptureData;
  layoutSourceId: string;
}) {
  const sourceNode = document.getElementById(layoutSourceId);

  if (!sourceNode) {
    throw new Error("Couldn't find the live poster preview.");
  }

  const sourceRect = sourceNode.getBoundingClientRect();
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sourceRect.width * scale);
  canvas.height = Math.round(sourceRect.height * scale);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Couldn't prepare the poster canvas.");
  }

  await ensureFontsReady();

  const backgroundBlob = await toBlob(sourceNode, {
    cacheBust: true,
    pixelRatio: scale,
    backgroundColor: "#faf6ef",
    filter: (node) => !(node instanceof HTMLImageElement),
  });

  if (!backgroundBlob) {
    throw new Error("Couldn't prepare the poster image.");
  }

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

async function renderManualPosterBlob({
  data,
  formatId,
}: {
  data: PosterCaptureData;
  formatId: PosterExportFormatId;
}) {
  const format = getPosterExportFormat(formatId);
  const layout = getManualLayout(formatId);
  const canvas = document.createElement("canvas");
  canvas.width = format.width;
  canvas.height = format.height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Couldn't prepare the poster canvas.");
  }

  await ensureFontsReady();

  context.fillStyle = "#faf6ef";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const panelX = layout.canvasPaddingX;
  const panelY = layout.canvasPaddingY;
  const panelWidth = canvas.width - layout.canvasPaddingX * 2;
  const panelHeight = canvas.height - layout.canvasPaddingY * 2;

  buildRoundedRectPath(context, panelX, panelY, panelWidth, panelHeight, layout.radius);
  context.fillStyle = "#fbf9f4";
  context.fill();
  context.strokeStyle = "rgba(94,126,152,0.12)";
  context.lineWidth = 1;
  context.stroke();

  const contentWidth = panelWidth - layout.posterPadding * 2;
  const titleLines = wrapPosterTitle(data.locationLabel.toUpperCase(), formatId === "story" ? 11 : formatId === "square" ? 13 : 15);
  const fittedTitleSize = getFittedTitleSize(context, titleLines, contentWidth * (formatId === "story" ? 0.98 : 0.94), layout.titleSize, formatId === "story" ? 140 : 88);
  const titleLineHeight = Math.round(fittedTitleSize * layout.titleLeading);
  const titleBlockHeight =
    Math.round(fittedTitleSize + Math.max(0, titleLines.length - 1) * titleLineHeight) +
    (formatId === "story" ? 18 : 12);
  const metaBlockHeight = layout.metaSize + (formatId === "story" ? 52 : 48);
  const footerBlockHeight = layout.footerSize + layout.footerTopPadding + 18;
  const availableGridHeight =
    panelHeight - layout.posterPadding * 2 - 22 - titleBlockHeight - metaBlockHeight - layout.gridTopMargin - footerBlockHeight;
  const tileWidth = Math.floor((contentWidth - layout.gap * (layout.columns - 1)) / layout.columns);
  const maxTileHeight = Math.floor((Math.floor(availableGridHeight * layout.gridHeightScale) - layout.gap * 2) / 3);
  const tileHeight =
    formatId === "story"
      ? Math.min(Math.floor(tileWidth * layout.tileAspectRatio), maxTileHeight)
      : Math.floor((Math.floor(availableGridHeight * layout.gridHeightScale) - layout.gap * 2) / 3);
  const titleBaseY = panelY + layout.posterPadding + fittedTitleSize;

  context.fillStyle = "rgba(32,26,23,0.6)";
  context.font = `600 ${layout.kickerSize}px ui-sans-serif, system-ui, sans-serif`;
  context.textAlign = "left";
  setCanvasLetterSpacing(context, "0.16em");
  context.fillText("COLOR HUNT", panelX + layout.posterPadding, panelY + (formatId === "story" ? 48 : formatId === "square" ? 42 : 36));

  context.strokeStyle = "rgba(94,126,152,0.14)";
  context.beginPath();
  context.moveTo(panelX + layout.posterPadding, panelY + 64);
  context.lineTo(panelX + panelWidth - layout.posterPadding, panelY + 64);
  context.stroke();

  context.fillStyle = data.posterTone;
  context.font = `600 ${fittedTitleSize}px "Cormorant Garamond", Georgia, serif`;
  setCanvasLetterSpacing(context, "0px");
  titleLines.forEach((line, index) => {
    context.fillText(line, panelX + layout.posterPadding, titleBaseY + index * titleLineHeight);
  });

  const metaY = panelY + layout.posterPadding + titleBlockHeight + (formatId === "story" ? 46 : 42);
  context.strokeStyle = "rgba(90,120,150,0.16)";
  context.beginPath();
  context.moveTo(panelX + layout.posterPadding, metaY - 18);
  context.lineTo(panelX + panelWidth - layout.posterPadding, metaY - 18);
  context.stroke();

  context.fillStyle = "rgba(32,26,23,0.84)";
  context.font = `600 ${layout.metaSize}px ui-sans-serif, system-ui, sans-serif`;
  setCanvasLetterSpacing(context, "0.08em");
  context.fillText("EXPLORING", panelX + layout.posterPadding, metaY);

  context.fillStyle = "rgba(32,26,23,0.58)";
  context.font = `400 ${layout.metaSize}px ui-sans-serif, system-ui, sans-serif`;
  setCanvasLetterSpacing(context, "0.08em");
  context.fillText(data.location.toUpperCase(), panelX + layout.posterPadding + (formatId === "story" ? 286 : 198), metaY);

  context.fillStyle = "rgba(32,26,23,0.46)";
  context.font = `600 ${layout.metaSize}px ui-sans-serif, system-ui, sans-serif`;
  setCanvasLetterSpacing(context, "0.08em");
  const locationMetrics = context.measureText(data.location.toUpperCase());
  context.fillText(
    data.tripYear,
    panelX + layout.posterPadding + (formatId === "story" ? 286 : 198) + locationMetrics.width + (formatId === "story" ? 30 : 24),
    metaY,
  );

  const gridTop = panelY + layout.posterPadding + titleBlockHeight + metaBlockHeight + layout.gridTopMargin;

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
    const x = panelX + layout.posterPadding + column * (tileWidth + layout.gap);
    const y = gridTop + row * (tileHeight + layout.gap);

    buildRoundedRectPath(context, x, y, tileWidth, tileHeight, layout.tileRadius);
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
    buildRoundedRectPath(context, x, y, tileWidth, tileHeight, layout.tileRadius);
    context.clip();
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    context.restore();
  });

  context.strokeStyle = "rgba(94,126,152,0.12)";
  context.beginPath();
  const usedGridHeight = tileHeight * 3 + layout.gap * 2;
  const footerRuleY = gridTop + usedGridHeight + layout.footerTopPadding;
  context.moveTo(panelX + layout.posterPadding, footerRuleY);
  context.lineTo(panelX + panelWidth - layout.posterPadding, footerRuleY);
  context.stroke();

  context.fillStyle = "rgba(74,116,148,0.56)";
  context.font = `600 ${layout.footerSize}px ui-sans-serif, system-ui, sans-serif`;
  context.textAlign = "center";
  setCanvasLetterSpacing(context, "0.14em");
  context.fillText(
    "ONE PLACE. ONE COLOR. NINE MOMENTS.",
    canvas.width / 2,
    footerRuleY + layout.footerTopPadding + layout.footerSize + (formatId === "story" ? 4 : 2),
  );

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

export async function renderPosterBlob({
  posterData,
  formatId = "post",
  layoutSourceId,
}: {
  posterData: PosterCaptureData;
  formatId?: PosterExportFormatId;
  layoutSourceId?: string;
}) {
  if (formatId === "post" && layoutSourceId) {
    return await renderPostFromLiveLayout({ data: posterData, layoutSourceId });
  }

  return await renderManualPosterBlob({ data: posterData, formatId });
}

export async function openBlob(blob: Blob, fileName: string) {
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

export async function shareOrDownloadBlob(blob: Blob, fileName: string) {
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
    return "shared" as const;
  }

  await openBlob(blob, fileName);
  return "downloaded" as const;
}
