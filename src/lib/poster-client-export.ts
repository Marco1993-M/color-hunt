"use client";

import { toBlob } from "html-to-image";
import { getPosterExportFormat, type PosterExportFormatId } from "@/lib/poster-export";

export type PosterCaptureData = {
  locationLabel: string;
  location: string;
  missionColorName: string;
  tripYear: string;
  posterTone: string;
  photoUrls: Array<string | null>;
};

export type PosterThemeId = "classic" | "story-collage";

type StoryCollageSlot = {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom?: number;
  focalX?: number;
  focalY?: number;
  role?: "hero" | "supporting" | "accent" | "color-card";
};

type StoryCollageShadow = {
  blur: number;
  offsetX: number;
  offsetY: number;
  color: string;
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

const STORY_COLLAGE_TEMPLATE_URL = "/poster-template-story-collage.png";
const STORY_COLLAGE_TEMPLATE_WIDTH = 1974;
const STORY_COLLAGE_TEMPLATE_HEIGHT = 3508;
const STORY_COLLAGE_SLOTS: StoryCollageSlot[] = [
  { x: 761, y: 323, width: 269, height: 370, role: "color-card" },
  { x: 991, y: 485, width: 788, height: 1029, zoom: 1.04, focalX: 0.52, focalY: 0.42, role: "hero" },
  { x: 331, y: 651, width: 596, height: 601, zoom: 1.03, focalX: 0.48, focalY: 0.38, role: "supporting" },
  { x: 795, y: 842, width: 269, height: 370, zoom: 1.12, focalX: 0.5, focalY: 0.34, role: "accent" },
  { x: 169, y: 1217, width: 854, height: 865, zoom: 1.02, focalX: 0.46, focalY: 0.5, role: "hero" },
  { x: 820, y: 1442, width: 443, height: 631, zoom: 1.1, focalX: 0.52, focalY: 0.42, role: "accent" },
  { x: 1090, y: 1622, width: 716, height: 942, zoom: 1.05, focalX: 0.5, focalY: 0.44, role: "supporting" },
  { x: 409, y: 2150, width: 651, height: 876, zoom: 1.03, focalX: 0.48, focalY: 0.42, role: "supporting" },
  { x: 990, y: 2416, width: 584, height: 769, zoom: 1.07, focalX: 0.5, focalY: 0.46, role: "accent" },
];
const STORY_COLLAGE_DRAW_ORDER = [1, 4, 2, 3, 6, 5, 7, 8, 0];
const STORY_COLLAGE_BASE_SLOT_SHADOW: StoryCollageShadow = {
  blur: 10,
  offsetX: 2,
  offsetY: 6,
  color: "rgba(32, 24, 18, 0.12)",
};
const STORY_COLLAGE_ELEVATED_SLOT_SHADOWS = new Map<number, StoryCollageShadow>([
  [
    3,
    {
      blur: 22,
      offsetX: 4,
      offsetY: 12,
      color: "rgba(32, 24, 18, 0.24)",
    },
  ],
  [
    5,
    {
      blur: 24,
      offsetX: 4,
      offsetY: 14,
      color: "rgba(32, 24, 18, 0.24)",
    },
  ],
  [
    8,
    {
      blur: 26,
      offsetX: 4,
      offsetY: 16,
      color: "rgba(32, 24, 18, 0.24)",
    },
  ],
]);
const STORY_COLLAGE_REPAINT_AFTER_OVERLAY = [5, 8];

let storyCollageOverlayPromise: Promise<HTMLCanvasElement> | null = null;
const posterBlobPromiseCache = new Map<string, Promise<Blob>>();

function setCanvasLetterSpacing(context: CanvasRenderingContext2D, value: string) {
  const nextContext = context as CanvasRenderingContext2D & { letterSpacing?: string };
  nextContext.letterSpacing = value;
}

function drawStoryCollageColorCard(
  context: CanvasRenderingContext2D,
  slot: StoryCollageSlot,
  scaleX: number,
  scaleY: number,
  data: PosterCaptureData,
) {
  const x = slot.x * scaleX;
  const y = slot.y * scaleY;
  const width = slot.width * scaleX;
  const height = slot.height * scaleY;
  const labelBandHeight = height * 0.28;
  const innerPaddingX = width * 0.08;
  const innerPaddingTop = labelBandHeight * 0.24;
  const brandSize = Math.max(8, width * 0.072);
  const nameSize = Math.max(14, width * 0.122);

  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();

  context.fillStyle = data.posterTone;
  context.fillRect(x, y, width, height - labelBandHeight);

  context.fillStyle = "#f6f0e5";
  context.fillRect(x, y + height - labelBandHeight, width, labelBandHeight);

  context.fillStyle = "rgba(30, 24, 20, 0.88)";
  context.textAlign = "left";
  context.textBaseline = "top";
  context.font = `600 ${brandSize}px ui-sans-serif, system-ui, sans-serif`;
  setCanvasLetterSpacing(context, "0.14em");
  context.fillText("COLOR HUNT", x + innerPaddingX, y + height - labelBandHeight + innerPaddingTop);

  context.font = `600 ${nameSize}px ui-sans-serif, system-ui, sans-serif`;
  setCanvasLetterSpacing(context, "0.06em");
  context.fillText(
    data.missionColorName.toUpperCase(),
    x + innerPaddingX,
    y + height - labelBandHeight + innerPaddingTop + brandSize + labelBandHeight * 0.1,
  );

  context.restore();
}

function drawCenteredMetaLine({
  context,
  centerX,
  y,
  leadText,
  bodyText,
  yearText,
  fontSize,
}: {
  context: CanvasRenderingContext2D;
  centerX: number;
  y: number;
  leadText: string;
  bodyText: string;
  yearText: string;
  fontSize: number;
}) {
  const gapPrimary = Math.max(18, fontSize * 0.62);
  const gapSecondary = Math.max(18, fontSize * 0.58);

  context.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  setCanvasLetterSpacing(context, "0.08em");
  const leadWidth = context.measureText(leadText).width;

  context.font = `400 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  setCanvasLetterSpacing(context, "0.08em");
  const bodyWidth = context.measureText(bodyText).width;

  context.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  setCanvasLetterSpacing(context, "0.08em");
  const yearWidth = context.measureText(yearText).width;

  const totalWidth = leadWidth + gapPrimary + bodyWidth + gapSecondary + yearWidth;
  const startX = centerX - totalWidth / 2;

  context.textAlign = "left";
  context.textBaseline = "alphabetic";

  context.fillStyle = "rgba(32,26,23,0.84)";
  context.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  setCanvasLetterSpacing(context, "0.08em");
  context.fillText(leadText, startX, y);

  context.fillStyle = "rgba(32,26,23,0.58)";
  context.font = `400 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  setCanvasLetterSpacing(context, "0.08em");
  context.fillText(bodyText, startX + leadWidth + gapPrimary, y);

  context.fillStyle = "rgba(32,26,23,0.46)";
  context.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  setCanvasLetterSpacing(context, "0.08em");
  context.fillText(yearText, startX + leadWidth + gapPrimary + bodyWidth + gapSecondary, y);
}

function applyStoryCollagePhotoFinish(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  role: StoryCollageSlot["role"] = "supporting",
) {
  const isHero = role === "hero";
  const isAccent = role === "accent";
  const topHighlight = isHero ? 0.13 : isAccent ? 0.18 : 0.16;
  const midHighlight = isHero ? 0.04 : isAccent ? 0.08 : 0.06;
  const bottomShade = isHero ? 0.06 : isAccent ? 0.1 : 0.08;
  const warmWash = isHero ? 0.03 : isAccent ? 0.06 : 0.045;
  const edgeShade = isHero ? 0.03 : isAccent ? 0.06 : 0.045;

  const highlight = context.createLinearGradient(x, y, x, y + height);
  highlight.addColorStop(0, `rgba(255, 251, 244, ${topHighlight})`);
  highlight.addColorStop(0.28, `rgba(255, 248, 238, ${midHighlight})`);
  highlight.addColorStop(0.52, "rgba(255, 255, 255, 0)");
  highlight.addColorStop(1, `rgba(72, 50, 28, ${bottomShade})`);
  context.fillStyle = highlight;
  context.fillRect(x, y, width, height);

  context.fillStyle = `rgba(247, 239, 229, ${warmWash})`;
  context.fillRect(x, y, width, height);

  const sideShade = context.createLinearGradient(x, y, x + width, y);
  sideShade.addColorStop(0, `rgba(92, 66, 42, ${edgeShade})`);
  sideShade.addColorStop(0.18, "rgba(255, 255, 255, 0)");
  sideShade.addColorStop(0.82, "rgba(255, 255, 255, 0)");
  sideShade.addColorStop(1, `rgba(92, 66, 42, ${edgeShade + 0.01})`);
  context.fillStyle = sideShade;
  context.fillRect(x, y, width, height);
}

function getStoryCollageDrawRect({
  slot,
  image,
  scaleX,
  scaleY,
}: {
  slot: StoryCollageSlot;
  image: CanvasImageSource & { width: number; height: number };
  scaleX: number;
  scaleY: number;
}) {
  const x = slot.x * scaleX;
  const y = slot.y * scaleY;
  const width = slot.width * scaleX;
  const height = slot.height * scaleY;
  const zoom = slot.zoom ?? 1;
  const focalX = slot.focalX ?? 0.5;
  const focalY = slot.focalY ?? 0.5;
  const scale = Math.max(width / image.width, height / image.height) * zoom;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const overflowX = Math.max(0, drawWidth - width);
  const overflowY = Math.max(0, drawHeight - height);
  const drawX = x - overflowX * focalX;
  const drawY = y - overflowY * focalY;

  return {
    x,
    y,
    width,
    height,
    drawX,
    drawY,
    drawWidth,
    drawHeight,
  };
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

function getCenteredTitleBaseY({
  formatId,
  panelY,
  posterPadding,
  fittedTitleSize,
  titleLineHeight,
  titleLineCount,
  metaY,
  metaDividerOffset,
}: {
  formatId: PosterExportFormatId;
  panelY: number;
  posterPadding: number;
  fittedTitleSize: number;
  titleLineHeight: number;
  titleLineCount: number;
  metaY: number;
  metaDividerOffset: number;
}) {
  const defaultBaseY = panelY + posterPadding + fittedTitleSize;

  if (formatId === "post") {
    return defaultBaseY;
  }

  const topDividerY = panelY + 64;
  const lowerDividerY = metaY - metaDividerOffset;
  const titleBlockHeight = fittedTitleSize + Math.max(0, titleLineCount - 1) * titleLineHeight;
  const titleBlockTop = topDividerY + Math.max(0, (lowerDividerY - topDividerY - titleBlockHeight) / 2);

  return titleBlockTop + fittedTitleSize;
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

async function loadStaticImage(sourceUrl: string) {
  const image = new Image();
  image.decoding = "async";
  image.src = sourceUrl;
  await image.decode();
  return image;
}

async function loadStoryCollageOverlay(targetWidth: number, targetHeight: number) {
  if (!storyCollageOverlayPromise) {
    storyCollageOverlayPromise = (async () => {
      let templateImage: HTMLImageElement;

      try {
        templateImage = await loadStaticImage(STORY_COLLAGE_TEMPLATE_URL);
      } catch {
        storyCollageOverlayPromise = null;
        throw new Error("Couldn't fetch the collage template.");
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Couldn't prepare the collage template.");
      }

      context.drawImage(templateImage, 0, 0, targetWidth, targetHeight);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      for (let index = 0; index < pixels.length; index += 4) {
        const red = pixels[index];
        const green = pixels[index + 1];
        const blue = pixels[index + 2];

        if (green > 190 && red < 130 && blue < 40) {
          pixels[index + 3] = 0;
        }
      }

      context.putImageData(imageData, 0, 0);
      return canvas;
    })();
  }

  return await storyCollageOverlayPromise;
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
  themeId = "classic",
}: {
  data: PosterCaptureData;
  formatId: PosterExportFormatId;
  themeId?: PosterThemeId;
}) {
  if (formatId === "story" && themeId === "story-collage") {
    return await renderStoryCollageBlob({ data });
  }

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
  const panelCenterX = panelX + panelWidth / 2;

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
  context.fillStyle = "rgba(32,26,23,0.6)";
  context.font = `600 ${layout.kickerSize}px ui-sans-serif, system-ui, sans-serif`;
  context.textAlign = "center";
  setCanvasLetterSpacing(context, "0.16em");
  context.fillText("COLOR HUNT", panelCenterX, panelY + (formatId === "story" ? 48 : formatId === "square" ? 42 : 36));

  context.strokeStyle = "rgba(94,126,152,0.14)";
  context.beginPath();
  context.moveTo(panelX + layout.posterPadding, panelY + 64);
  context.lineTo(panelX + panelWidth - layout.posterPadding, panelY + 64);
  context.stroke();

  const metaY = panelY + layout.posterPadding + titleBlockHeight + (formatId === "story" ? 46 : 42);
  const metaDividerOffset = formatId === "story" ? 34 : 18;
  const titleBaseY = getCenteredTitleBaseY({
    formatId,
    panelY,
    posterPadding: layout.posterPadding,
    fittedTitleSize,
    titleLineHeight,
    titleLineCount: titleLines.length,
    metaY,
    metaDividerOffset,
  });

  context.fillStyle = data.posterTone;
  context.font = `600 ${fittedTitleSize}px "Cormorant Garamond", Georgia, serif`;
  context.textAlign = "center";
  setCanvasLetterSpacing(context, "0px");
  titleLines.forEach((line, index) => {
    context.fillText(line, panelCenterX, titleBaseY + index * titleLineHeight);
  });

  context.strokeStyle = "rgba(90,120,150,0.16)";
  context.beginPath();
  context.moveTo(panelX + layout.posterPadding, metaY - metaDividerOffset);
  context.lineTo(panelX + panelWidth - layout.posterPadding, metaY - metaDividerOffset);
  context.stroke();

  drawCenteredMetaLine({
    context,
    centerX: panelCenterX,
    y: metaY,
    leadText: "EXPLORING",
    bodyText: data.location.toUpperCase(),
    yearText: data.tripYear,
    fontSize: layout.metaSize,
  });

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

async function renderStoryCollageBlob({
  data,
}: {
  data: PosterCaptureData;
}) {
  const format = getPosterExportFormat("story");
  const canvas = document.createElement("canvas");
  canvas.width = format.width;
  canvas.height = format.height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Couldn't prepare the collage poster canvas.");
  }

  const renderingContext = context;

  const scaleX = canvas.width / STORY_COLLAGE_TEMPLATE_WIDTH;
  const scaleY = canvas.height / STORY_COLLAGE_TEMPLATE_HEIGHT;

  const [overlay, loadedImages] = await Promise.all([
    loadStoryCollageOverlay(canvas.width, canvas.height),
    Promise.all(
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
    ),
  ]);

  context.fillStyle = "#f7f2e8";
  context.fillRect(0, 0, canvas.width, canvas.height);

  function drawSlotImage(index: number, includeShadow: boolean) {
    const slot = STORY_COLLAGE_SLOTS[index];

    if (index === 0) {
      drawStoryCollageColorCard(renderingContext, slot, scaleX, scaleY, data);
      return;
    }

    const image = loadedImages[index];

    if (!image) {
      return;
    }

    const { x, y, width, height, drawX, drawY, drawWidth, drawHeight } = getStoryCollageDrawRect({
      slot,
      image,
      scaleX,
      scaleY,
    });
    const shadow = includeShadow
      ? STORY_COLLAGE_ELEVATED_SLOT_SHADOWS.get(index) ?? STORY_COLLAGE_BASE_SLOT_SHADOW
      : null;

    renderingContext.save();

    if (slot.role === "hero") {
      renderingContext.filter = "saturate(0.96) contrast(0.99) brightness(1.01)";
    } else if (slot.role === "accent") {
      renderingContext.filter = "saturate(0.91) contrast(0.95) brightness(1.02)";
    } else {
      renderingContext.filter = "saturate(0.94) contrast(0.97) brightness(1.01)";
    }

    if (shadow) {
      renderingContext.shadowBlur = shadow.blur * scaleX;
      renderingContext.shadowOffsetX = shadow.offsetX * scaleX;
      renderingContext.shadowOffsetY = shadow.offsetY * scaleY;
      renderingContext.shadowColor = shadow.color;
    }

    renderingContext.beginPath();
    renderingContext.rect(x, y, width, height);
    renderingContext.clip();
    renderingContext.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    renderingContext.filter = "none";
    applyStoryCollagePhotoFinish(renderingContext, x, y, width, height, slot.role);
    renderingContext.restore();
  }

  STORY_COLLAGE_DRAW_ORDER.forEach((index) => {
    drawSlotImage(index, true);
  });

  context.drawImage(overlay, 0, 0, canvas.width, canvas.height);
  STORY_COLLAGE_REPAINT_AFTER_OVERLAY.forEach((index) => {
    drawSlotImage(index, false);
  });

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Couldn't prepare the collage poster image."));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
}

function getPosterBlobCacheKey({
  posterData,
  formatId,
  themeId,
}: {
  posterData: PosterCaptureData;
  formatId: PosterExportFormatId;
  themeId: PosterThemeId;
}) {
  return JSON.stringify({
    formatId,
    themeId,
    location: posterData.location,
    locationLabel: posterData.locationLabel,
    missionColorName: posterData.missionColorName,
    tripYear: posterData.tripYear,
    posterTone: posterData.posterTone,
    photoUrls: posterData.photoUrls,
  });
}

export function preparePosterBlob({
  posterData,
  formatId = "post",
  themeId = "classic",
}: {
  posterData: PosterCaptureData;
  formatId?: PosterExportFormatId;
  themeId?: PosterThemeId;
}) {
  const cacheKey = getPosterBlobCacheKey({
    posterData,
    formatId,
    themeId,
  });
  const cached = posterBlobPromiseCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const nextPromise = renderManualPosterBlob({
    data: posterData,
    formatId,
    themeId,
  }).catch((error) => {
    posterBlobPromiseCache.delete(cacheKey);
    throw error;
  });

  posterBlobPromiseCache.set(cacheKey, nextPromise);
  return nextPromise;
}

export async function renderPosterBlob({
  posterData,
  formatId = "post",
  layoutSourceId,
  themeId = "classic",
}: {
  posterData: PosterCaptureData;
  formatId?: PosterExportFormatId;
  layoutSourceId?: string;
  themeId?: PosterThemeId;
}) {
  if (formatId === "post" && themeId === "classic" && layoutSourceId) {
    return await renderPostFromLiveLayout({ data: posterData, layoutSourceId });
  }

  return await preparePosterBlob({ posterData, formatId, themeId });
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
