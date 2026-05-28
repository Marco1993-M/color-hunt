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

export type PosterThemeId = "classic" | "story-collage" | "story-scrapbook";

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

type StoryScrapbookCardKind = "frame" | "sticker" | "polaroid" | "cutout";

type StoryScrapbookSlot = {
  kind: StoryScrapbookCardKind;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  angle: number;
  accent: string;
  cropZoom?: number;
  focalX?: number;
  focalY?: number;
};

type StoryScrapbookTemplateSlotSpec = {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom?: number;
  focalX?: number;
  focalY?: number;
  matchesColor: (red: number, green: number, blue: number, alpha: number) => boolean;
};

type StoryScrapbookTemplateSlotAsset = {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom?: number;
  focalX?: number;
  focalY?: number;
  maskCanvas: HTMLCanvasElement;
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
const STORY_SCRAPBOOK_TEMPLATE_URL = "/poster-template-story-scrapbook.png";
const STORY_SCRAPBOOK_TEMPLATE_WIDTH = 1974;
const STORY_SCRAPBOOK_TEMPLATE_HEIGHT = 3508;
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
const STORY_SCRAPBOOK_PAPER = "#f8f1e7";
const STORY_SCRAPBOOK_PAPER_SHADE = "#f2e8dc";
const STORY_SCRAPBOOK_WHITE = "#fffdfa";
const STORY_SCRAPBOOK_INK = "#18263b";
const STORY_SCRAPBOOK_SOFT_INK = "#4b5770";
const STORY_SCRAPBOOK_GREEN = "#2a8b5b";
const STORY_SCRAPBOOK_PINK = "#f58dbb";
const STORY_SCRAPBOOK_CORAL = "#f38b7d";
const STORY_SCRAPBOOK_SKY = "#83beee";
const STORY_SCRAPBOOK_BUTTER = "#f3d76f";
const STORY_SCRAPBOOK_LILAC = "#ceb8ec";
const STORY_SCRAPBOOK_PEACH = "#f5c8b8";
const STORY_SCRAPBOOK_MINT = "#bfe3d2";
const STORY_SCRAPBOOK_TEMPLATE_SLOTS: StoryScrapbookTemplateSlotSpec[] = [
  {
    x: 238,
    y: 891,
    width: 707,
    height: 474,
    zoom: 1.03,
    focalX: 0.5,
    focalY: 0.45,
    matchesColor: (r, g, b, a) => a > 250 && r >= 220 && g >= 165 && g <= 210 && b >= 45 && b <= 105,
  },
  {
    x: 927,
    y: 956,
    width: 544,
    height: 544,
    zoom: 1.06,
    focalX: 0.5,
    focalY: 0.42,
    matchesColor: (r, g, b, a) => a > 250 && r <= 30 && g >= 70 && g <= 120 && b <= 30,
  },
  {
    x: 1377,
    y: 1188,
    width: 436,
    height: 664,
    zoom: 1.04,
    focalX: 0.5,
    focalY: 0.46,
    matchesColor: (r, g, b, a) => a > 250 && r >= 240 && g >= 120 && g <= 170 && b <= 80,
  },
  {
    x: 178,
    y: 1449,
    width: 829,
    height: 529,
    zoom: 1.02,
    focalX: 0.48,
    focalY: 0.48,
    matchesColor: (r, g, b, a) => a > 250 && r >= 140 && r <= 190 && g >= 140 && g <= 190 && b >= 140 && b <= 190,
  },
  {
    x: 984,
    y: 1750,
    width: 592,
    height: 595,
    zoom: 1.06,
    focalX: 0.5,
    focalY: 0.44,
    matchesColor: (r, g, b, a) => a > 250 && r >= 190 && g <= 70 && b >= 20 && b <= 120,
  },
  {
    x: 132,
    y: 2067,
    width: 472,
    height: 621,
    zoom: 1.03,
    focalX: 0.48,
    focalY: 0.42,
    matchesColor: (r, g, b, a) => a > 250 && r >= 180 && r <= 235 && g >= 220 && b <= 120,
  },
  {
    x: 644,
    y: 2234,
    width: 419,
    height: 576,
    zoom: 1.04,
    focalX: 0.5,
    focalY: 0.44,
    matchesColor: (r, g, b, a) => a > 250 && r >= 40 && r <= 120 && g >= 200 && b >= 140 && b <= 225,
  },
  {
    x: 281,
    y: 2803,
    width: 552,
    height: 383,
    zoom: 1.05,
    focalX: 0.5,
    focalY: 0.48,
    matchesColor: (r, g, b, a) => a > 250 && r <= 100 && g <= 100 && b >= 220,
  },
  {
    x: 1126,
    y: 2402,
    width: 651,
    height: 863,
    zoom: 1.02,
    focalX: 0.5,
    focalY: 0.46,
    matchesColor: (r, g, b, a) => a > 250 && r >= 60 && r <= 110 && g >= 190 && b >= 215,
  },
];
const STORY_SCRAPBOOK_SLOTS: StoryScrapbookSlot[] = [
  {
    kind: "frame",
    centerX: 248,
    centerY: 574,
    width: 392,
    height: 276,
    angle: -2.5,
    accent: STORY_SCRAPBOOK_PINK,
    cropZoom: 1.03,
    focalX: 0.5,
    focalY: 0.42,
  },
  {
    kind: "sticker",
    centerX: 732,
    centerY: 534,
    width: 256,
    height: 196,
    angle: 4,
    accent: STORY_SCRAPBOOK_LILAC,
    cropZoom: 1.08,
    focalX: 0.5,
    focalY: 0.48,
  },
  {
    kind: "frame",
    centerX: 846,
    centerY: 760,
    width: 246,
    height: 334,
    angle: 1.5,
    accent: STORY_SCRAPBOOK_SKY,
    cropZoom: 1.07,
    focalX: 0.52,
    focalY: 0.38,
  },
  {
    kind: "frame",
    centerX: 314,
    centerY: 874,
    width: 452,
    height: 286,
    angle: -0.8,
    accent: STORY_SCRAPBOOK_PEACH,
    cropZoom: 1.03,
    focalX: 0.5,
    focalY: 0.48,
  },
  {
    kind: "polaroid",
    centerX: 626,
    centerY: 964,
    width: 214,
    height: 292,
    angle: 2.2,
    accent: STORY_SCRAPBOOK_BUTTER,
    cropZoom: 1.08,
    focalX: 0.5,
    focalY: 0.38,
  },
  {
    kind: "cutout",
    centerX: 890,
    centerY: 1074,
    width: 182,
    height: 238,
    angle: 5.5,
    accent: STORY_SCRAPBOOK_MINT,
    cropZoom: 1.1,
    focalX: 0.52,
    focalY: 0.34,
  },
  {
    kind: "sticker",
    centerX: 234,
    centerY: 1266,
    width: 208,
    height: 256,
    angle: -7,
    accent: STORY_SCRAPBOOK_LILAC,
    cropZoom: 1.08,
    focalX: 0.48,
    focalY: 0.42,
  },
  {
    kind: "frame",
    centerX: 724,
    centerY: 1386,
    width: 356,
    height: 504,
    angle: -2.2,
    accent: STORY_SCRAPBOOK_CORAL,
    cropZoom: 1.02,
    focalX: 0.5,
    focalY: 0.4,
  },
  {
    kind: "cutout",
    centerX: 418,
    centerY: 1568,
    width: 232,
    height: 164,
    angle: 6,
    accent: STORY_SCRAPBOOK_GREEN,
    cropZoom: 1.07,
    focalX: 0.48,
    focalY: 0.46,
  },
];

let storyCollageOverlayPromise: Promise<HTMLCanvasElement> | null = null;
let storyScrapbookTemplatePromise:
  | Promise<{ overlay: HTMLCanvasElement; slots: StoryScrapbookTemplateSlotAsset[] }>
  | null = null;
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

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

function createCanvasContext(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Couldn't prepare the poster canvas.");
  }

  return { canvas, context };
}

function drawRotatedCanvas({
  context,
  source,
  centerX,
  centerY,
  angle,
}: {
  context: CanvasRenderingContext2D;
  source: HTMLCanvasElement;
  centerX: number;
  centerY: number;
  angle: number;
}) {
  context.save();
  context.translate(centerX, centerY);
  context.rotate(degreesToRadians(angle));
  context.drawImage(source, -source.width / 2, -source.height / 2);
  context.restore();
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

async function loadStoryScrapbookTemplateAssets(targetWidth: number, targetHeight: number) {
  if (!storyScrapbookTemplatePromise) {
    storyScrapbookTemplatePromise = (async () => {
      let templateImage: HTMLImageElement;

      try {
        templateImage = await loadStaticImage(STORY_SCRAPBOOK_TEMPLATE_URL);
      } catch {
        storyScrapbookTemplatePromise = null;
        throw new Error("Couldn't fetch the scrapbook template.");
      }

      const { canvas: overlayCanvas, context: overlayContext } = createCanvasContext(targetWidth, targetHeight);
      overlayContext.drawImage(templateImage, 0, 0, targetWidth, targetHeight);
      const overlayImageData = overlayContext.getImageData(0, 0, targetWidth, targetHeight);
      const overlayPixels = overlayImageData.data;
      const scaleX = targetWidth / STORY_SCRAPBOOK_TEMPLATE_WIDTH;
      const scaleY = targetHeight / STORY_SCRAPBOOK_TEMPLATE_HEIGHT;

      const slots = STORY_SCRAPBOOK_TEMPLATE_SLOTS.map((slot) => {
        const x = Math.round(slot.x * scaleX);
        const y = Math.round(slot.y * scaleY);
        const width = Math.round(slot.width * scaleX);
        const height = Math.round(slot.height * scaleY);
        const { canvas: maskCanvas, context: maskContext } = createCanvasContext(width, height);
        const maskImageData = maskContext.createImageData(width, height);
        const maskPixels = maskImageData.data;

        for (let localY = 0; localY < height; localY += 1) {
          for (let localX = 0; localX < width; localX += 1) {
            const sourceX = x + localX;
            const sourceY = y + localY;
            const overlayIndex = (sourceY * targetWidth + sourceX) * 4;
            const red = overlayPixels[overlayIndex];
            const green = overlayPixels[overlayIndex + 1];
            const blue = overlayPixels[overlayIndex + 2];
            const alpha = overlayPixels[overlayIndex + 3];

            if (!slot.matchesColor(red, green, blue, alpha)) {
              continue;
            }

            const maskIndex = (localY * width + localX) * 4;
            maskPixels[maskIndex] = 255;
            maskPixels[maskIndex + 1] = 255;
            maskPixels[maskIndex + 2] = 255;
            maskPixels[maskIndex + 3] = 255;
            overlayPixels[overlayIndex + 3] = 0;
          }
        }

        maskContext.putImageData(maskImageData, 0, 0);

        return {
          x,
          y,
          width,
          height,
          zoom: slot.zoom,
          focalX: slot.focalX,
          focalY: slot.focalY,
          maskCanvas,
        };
      });

      overlayContext.putImageData(overlayImageData, 0, 0);

      return { overlay: overlayCanvas, slots };
    })();
  }

  return await storyScrapbookTemplatePromise;
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

function hexToRgb(color: string) {
  const cleaned = color.replace("#", "");
  const nextColor = cleaned.length === 3 ? cleaned.split("").map((value) => value + value).join("") : cleaned;
  const value = Number.parseInt(nextColor, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgba(color: string, alpha: number) {
  const { r, g, b } = hexToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function fitFontSizeToWidth({
  context,
  text,
  maxWidth,
  initialSize,
  minSize,
  fontFamily,
  fontWeight = 700,
}: {
  context: CanvasRenderingContext2D;
  text: string;
  maxWidth: number;
  initialSize: number;
  minSize: number;
  fontFamily: string;
  fontWeight?: number;
}) {
  let nextSize = initialSize;

  while (nextSize > minSize) {
    context.font = `${fontWeight} ${nextSize}px ${fontFamily}`;

    if (context.measureText(text).width <= maxWidth) {
      return nextSize;
    }

    nextSize -= 1;
  }

  return minSize;
}

function drawStrokedFillText({
  context,
  text,
  x,
  y,
  fillStyle,
  strokeStyle,
  strokeWidth,
}: {
  context: CanvasRenderingContext2D;
  text: string;
  x: number;
  y: number;
  fillStyle: string;
  strokeStyle: string;
  strokeWidth: number;
}) {
  context.strokeStyle = strokeStyle;
  context.lineWidth = strokeWidth;
  context.lineJoin = "round";
  context.miterLimit = 2;
  context.strokeText(text, x, y);
  context.fillStyle = fillStyle;
  context.fillText(text, x, y);
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

  if (formatId === "story" && themeId === "story-scrapbook") {
    return await renderStoryScrapbookBlob({ data });
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

function drawStoryScrapbookPaperBackground(context: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, STORY_SCRAPBOOK_PAPER);
  gradient.addColorStop(1, STORY_SCRAPBOOK_PAPER_SHADE);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  for (let index = 0; index < 650; index += 1) {
    const x = ((index * 73.17) % width) + ((index % 11) - 5) * 0.7;
    const y = ((index * 41.91) % height) + ((index % 7) - 3) * 0.8;
    const radius = 1 + (index % 3) * 0.55;
    const alpha = 0.04 + (index % 5) * 0.012;
    context.fillStyle = `rgba(255,255,255,${alpha})`;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.strokeStyle = "rgba(129, 103, 82, 0.09)";
  context.lineWidth = 1;
  for (let index = 0; index < 260; index += 1) {
    const x = (index * 57.3) % (width - 100);
    const y = (index * 29.6) % height;
    const lineWidth = 16 + ((index * 19) % 76);
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + lineWidth, y);
    context.stroke();
  }

  context.fillStyle = "rgba(255,255,255,0.18)";
  context.fillRect(width / 2 - 3, 0, 6, height);
  context.fillStyle = "rgba(120, 96, 76, 0.06)";
  context.fillRect(width / 2 + 3, 0, 4, height);

  const washOne = context.createRadialGradient(width * 0.75, height * 0.18, 40, width * 0.75, height * 0.18, 280);
  washOne.addColorStop(0, "rgba(245, 141, 187, 0.12)");
  washOne.addColorStop(1, "rgba(245, 141, 187, 0)");
  context.fillStyle = washOne;
  context.fillRect(0, 0, width, height);

  const washTwo = context.createRadialGradient(width * 0.18, height * 0.53, 32, width * 0.18, height * 0.53, 240);
  washTwo.addColorStop(0, "rgba(131, 190, 238, 0.1)");
  washTwo.addColorStop(1, "rgba(131, 190, 238, 0)");
  context.fillStyle = washTwo;
  context.fillRect(0, 0, width, height);
}

function getStoryScrapbookShadow(slot: StoryScrapbookSlot) {
  if (slot.kind === "frame" || slot.kind === "polaroid") {
    return {
      blur: 20,
      offsetX: 0,
      offsetY: 10,
      color: "rgba(42, 24, 18, 0.18)",
    };
  }

  return {
    blur: 16,
    offsetX: 0,
    offsetY: 8,
    color: "rgba(42, 24, 18, 0.14)",
  };
}

function getStoryScrapbookPhotoRect(slot: StoryScrapbookSlot, cardWidth: number, cardHeight: number) {
  switch (slot.kind) {
    case "polaroid":
      return {
        x: 13,
        y: 13,
        width: cardWidth - 26,
        height: cardHeight - 94,
        radius: 18,
      };
    case "sticker":
      return {
        x: 28,
        y: 28,
        width: slot.width,
        height: slot.height,
        radius: 22,
      };
    case "cutout":
      return {
        x: 32,
        y: 32,
        width: slot.width,
        height: slot.height,
        radius: 24,
      };
    default:
      return {
        x: 15,
        y: 15,
        width: cardWidth - 30,
        height: cardHeight - 30,
        radius: 22,
      };
  }
}

function drawStoryScrapbookPhoto({
  context,
  image,
  slot,
  photoRect,
}: {
  context: CanvasRenderingContext2D;
  image: HTMLImageElement | null;
  slot: StoryScrapbookSlot;
  photoRect: { x: number; y: number; width: number; height: number; radius: number };
}) {
  context.save();
  buildRoundedRectPath(context, photoRect.x, photoRect.y, photoRect.width, photoRect.height, photoRect.radius);
  context.clip();

  if (!image) {
    const fallback = context.createLinearGradient(
      photoRect.x,
      photoRect.y,
      photoRect.x + photoRect.width,
      photoRect.y + photoRect.height,
    );
    fallback.addColorStop(0, rgba(slot.accent, 0.74));
    fallback.addColorStop(1, "rgba(255,255,255,0.72)");
    context.fillStyle = fallback;
    context.fillRect(photoRect.x, photoRect.y, photoRect.width, photoRect.height);
    context.restore();
    return;
  }

  const zoom = slot.cropZoom ?? 1.04;
  const focalX = slot.focalX ?? 0.5;
  const focalY = slot.focalY ?? 0.44;
  const scale = Math.max(photoRect.width / image.width, photoRect.height / image.height) * zoom;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const overflowX = Math.max(0, drawWidth - photoRect.width);
  const overflowY = Math.max(0, drawHeight - photoRect.height);
  const drawX = photoRect.x - overflowX * focalX;
  const drawY = photoRect.y - overflowY * focalY;

  context.filter = slot.kind === "cutout" ? "saturate(0.98) contrast(0.96) brightness(1.03)" : "saturate(0.95) contrast(0.97) brightness(1.02)";
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  context.filter = "none";

  const gloss = context.createLinearGradient(photoRect.x, photoRect.y, photoRect.x, photoRect.y + photoRect.height);
  gloss.addColorStop(0, "rgba(255,255,255,0.16)");
  gloss.addColorStop(0.32, "rgba(255,248,242,0.05)");
  gloss.addColorStop(1, "rgba(78,54,36,0.08)");
  context.fillStyle = gloss;
  context.fillRect(photoRect.x, photoRect.y, photoRect.width, photoRect.height);

  const edgeShade = context.createLinearGradient(photoRect.x, photoRect.y, photoRect.x + photoRect.width, photoRect.y);
  edgeShade.addColorStop(0, "rgba(92,66,42,0.05)");
  edgeShade.addColorStop(0.2, "rgba(255,255,255,0)");
  edgeShade.addColorStop(0.8, "rgba(255,255,255,0)");
  edgeShade.addColorStop(1, "rgba(92,66,42,0.06)");
  context.fillStyle = edgeShade;
  context.fillRect(photoRect.x, photoRect.y, photoRect.width, photoRect.height);
  context.restore();
}

function makeStoryScrapbookCard({
  slot,
  image,
  index,
}: {
  slot: StoryScrapbookSlot;
  image: HTMLImageElement | null;
  index: number;
}) {
  const stickerPadding = slot.kind === "sticker" ? 28 : slot.kind === "cutout" ? 32 : 0;
  const width = slot.width + stickerPadding * 2;
  const height = slot.height + stickerPadding * 2;
  const { canvas, context } = createCanvasContext(width, height);
  const photoRect = getStoryScrapbookPhotoRect(slot, width, height);

  if (slot.kind === "cutout") {
    context.fillStyle = STORY_SCRAPBOOK_WHITE;
    buildRoundedRectPath(context, photoRect.x - 14, photoRect.y - 14, photoRect.width + 28, photoRect.height + 28, 28);
    context.fill();
    drawStoryScrapbookPhoto({ context, image, slot, photoRect });
    context.strokeStyle = "rgba(232, 218, 206, 0.92)";
    context.lineWidth = 2;
    buildRoundedRectPath(context, photoRect.x, photoRect.y, photoRect.width, photoRect.height, photoRect.radius);
    context.stroke();

    context.fillStyle = "rgba(255,255,255,0.92)";
    context.beginPath();
    context.arc(width - 34, 28, 16, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = STORY_SCRAPBOOK_PINK;
    context.font = `700 18px ui-sans-serif, system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("★", width - 34, 29);
    return canvas;
  }

  context.fillStyle = STORY_SCRAPBOOK_WHITE;
  buildRoundedRectPath(context, 0, 0, width, height, slot.kind === "sticker" ? 34 : 24);
  context.fill();
  context.strokeStyle = "rgba(226, 211, 198, 0.92)";
  context.lineWidth = 2;
  buildRoundedRectPath(context, 0, 0, width, height, slot.kind === "sticker" ? 34 : 24);
  context.stroke();

  drawStoryScrapbookPhoto({ context, image, slot, photoRect });

  if (slot.kind === "polaroid") {
    context.fillStyle = "rgba(248, 244, 236, 1)";
    buildRoundedRectPath(context, 18, height - 62, width - 36, 42, 16);
    context.fill();
    context.fillStyle = STORY_SCRAPBOOK_SOFT_INK;
    context.font = `700 15px ui-sans-serif, system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    setCanvasLetterSpacing(context, "0.12em");
    context.fillText("COLOR CLUB", width / 2, height - 41);
    setCanvasLetterSpacing(context, "0px");
  }

  if (slot.kind === "sticker" && (index === 1 || index === 6)) {
    context.fillStyle = "rgba(255,255,255,0.94)";
    buildRoundedRectPath(context, 22, 16, 90, 32, 14);
    context.fill();
    context.fillStyle = STORY_SCRAPBOOK_INK;
    context.font = `700 16px ui-sans-serif, system-ui, sans-serif`;
    context.textAlign = "left";
    context.textBaseline = "top";
    setCanvasLetterSpacing(context, "0.12em");
    context.fillText("CLUB", 36, 24);
    setCanvasLetterSpacing(context, "0px");
  }

  return canvas;
}

function drawStoryScrapbookSpeechBubble({
  context,
  centerX,
  centerY,
  width,
  text,
}: {
  context: CanvasRenderingContext2D;
  centerX: number;
  centerY: number;
  width: number;
  text: string;
}) {
  const { canvas, context: bubbleContext } = createCanvasContext(width + 46, 130);
  bubbleContext.fillStyle = STORY_SCRAPBOOK_WHITE;
  buildRoundedRectPath(bubbleContext, 0, 0, width, 92, 42);
  bubbleContext.fill();
  bubbleContext.strokeStyle = "rgba(234, 220, 206, 1)";
  bubbleContext.lineWidth = 2;
  buildRoundedRectPath(bubbleContext, 0, 0, width, 92, 42);
  bubbleContext.stroke();
  bubbleContext.beginPath();
  bubbleContext.moveTo(width - 106, 80);
  bubbleContext.lineTo(width - 70, 116);
  bubbleContext.lineTo(width - 52, 82);
  bubbleContext.closePath();
  bubbleContext.fill();
  bubbleContext.stroke();

  bubbleContext.fillStyle = STORY_SCRAPBOOK_PINK;
  const bubbleFontSize = fitFontSizeToWidth({
    context: bubbleContext,
    text,
    maxWidth: width - 60,
    initialSize: 28,
    minSize: 18,
    fontFamily: `ui-sans-serif, system-ui, sans-serif`,
  });
  bubbleContext.font = `700 ${bubbleFontSize}px ui-sans-serif, system-ui, sans-serif`;
  bubbleContext.textAlign = "left";
  bubbleContext.textBaseline = "top";
  bubbleContext.fillText(text, 30, 24);

  context.save();
  context.translate(centerX, centerY);
  context.rotate(degreesToRadians(-2));
  context.shadowBlur = 16;
  context.shadowOffsetY = 8;
  context.shadowColor = "rgba(41, 21, 18, 0.12)";
  context.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  context.shadowColor = "transparent";
  context.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  context.restore();
}

function drawStoryScrapbookBow({
  context,
  centerX,
  centerY,
  angle,
}: {
  context: CanvasRenderingContext2D;
  centerX: number;
  centerY: number;
  angle: number;
}) {
  const { canvas, context: bowContext } = createCanvasContext(180, 150);
  bowContext.fillStyle = STORY_SCRAPBOOK_WHITE;
  bowContext.beginPath();
  bowContext.ellipse(45, 64, 38, 36, 0, 0, Math.PI * 2);
  bowContext.ellipse(135, 64, 38, 36, 0, 0, Math.PI * 2);
  bowContext.fill();
  bowContext.beginPath();
  bowContext.moveTo(68, 78);
  bowContext.lineTo(92, 62);
  bowContext.lineTo(118, 78);
  bowContext.lineTo(92, 104);
  bowContext.closePath();
  bowContext.fill();
  bowContext.beginPath();
  bowContext.moveTo(44, 88);
  bowContext.lineTo(68, 82);
  bowContext.lineTo(58, 136);
  bowContext.closePath();
  bowContext.fill();
  bowContext.beginPath();
  bowContext.moveTo(140, 88);
  bowContext.lineTo(116, 82);
  bowContext.lineTo(126, 136);
  bowContext.closePath();
  bowContext.fill();

  bowContext.fillStyle = STORY_SCRAPBOOK_PINK;
  bowContext.beginPath();
  bowContext.ellipse(47, 64, 24, 22, 0, 0, Math.PI * 2);
  bowContext.fill();
  bowContext.fillStyle = STORY_SCRAPBOOK_GREEN;
  bowContext.beginPath();
  bowContext.ellipse(133, 64, 24, 22, 0, 0, Math.PI * 2);
  bowContext.fill();
  bowContext.fillStyle = STORY_SCRAPBOOK_BUTTER;
  bowContext.beginPath();
  bowContext.moveTo(80, 80);
  bowContext.lineTo(92, 70);
  bowContext.lineTo(106, 80);
  bowContext.lineTo(92, 96);
  bowContext.closePath();
  bowContext.fill();

  context.save();
  context.translate(centerX, centerY);
  context.rotate(degreesToRadians(angle));
  context.shadowBlur = 14;
  context.shadowOffsetY = 8;
  context.shadowColor = "rgba(41, 21, 18, 0.11)";
  context.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  context.shadowColor = "transparent";
  context.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  context.restore();
}

function drawStoryScrapbookBadge({
  context,
  centerX,
  centerY,
  text,
  color,
  angle = 0,
}: {
  context: CanvasRenderingContext2D;
  centerX: number;
  centerY: number;
  text: string;
  color: string;
  angle?: number;
}) {
  const { canvas, context: badgeContext } = createCanvasContext(188, 70);
  badgeContext.fillStyle = color;
  buildRoundedRectPath(badgeContext, 0, 0, canvas.width, canvas.height, 28);
  badgeContext.fill();
  badgeContext.fillStyle = STORY_SCRAPBOOK_WHITE;
  badgeContext.font = `700 24px ui-sans-serif, system-ui, sans-serif`;
  badgeContext.textAlign = "center";
  badgeContext.textBaseline = "middle";
  setCanvasLetterSpacing(badgeContext, "0.1em");
  badgeContext.fillText(text, canvas.width / 2, canvas.height / 2 + 1);
  setCanvasLetterSpacing(badgeContext, "0px");

  context.save();
  context.translate(centerX, centerY);
  context.rotate(degreesToRadians(angle));
  context.shadowBlur = 14;
  context.shadowOffsetY = 8;
  context.shadowColor = "rgba(41, 21, 18, 0.1)";
  context.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  context.shadowColor = "transparent";
  context.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  context.restore();
}

function drawStoryScrapbookLocationTicket({
  context,
  centerX,
  centerY,
  locationLabel,
  tone,
}: {
  context: CanvasRenderingContext2D;
  centerX: number;
  centerY: number;
  locationLabel: string;
  tone: string;
}) {
  const city = locationLabel.split(",")[0]?.trim() || "COLOR HUNT";
  const region = locationLabel.split(",").slice(1).join(",").trim() || locationLabel.trim() || "POSTER CLUB";
  const { canvas, context: ticketContext } = createCanvasContext(292, 102);

  ticketContext.fillStyle = STORY_SCRAPBOOK_WHITE;
  buildRoundedRectPath(ticketContext, 0, 0, canvas.width, canvas.height, 24);
  ticketContext.fill();
  ticketContext.strokeStyle = "rgba(229, 214, 202, 1)";
  ticketContext.lineWidth = 2;
  buildRoundedRectPath(ticketContext, 0, 0, canvas.width, canvas.height, 24);
  ticketContext.stroke();

  ticketContext.fillStyle = tone;
  ticketContext.fillRect(22, 20, 62, 62);
  ticketContext.fillStyle = STORY_SCRAPBOOK_PINK;
  ticketContext.fillRect(90, 20, 22, 62);

  const citySize = fitFontSizeToWidth({
    context: ticketContext,
    text: city.toUpperCase(),
    maxWidth: 136,
    initialSize: 13,
    minSize: 10,
    fontFamily: `"Cormorant Garamond", Georgia, serif`,
    fontWeight: 700,
  });
  const regionSize = fitFontSizeToWidth({
    context: ticketContext,
    text: region.toUpperCase(),
    maxWidth: 136,
    initialSize: 22,
    minSize: 14,
    fontFamily: `"Cormorant Garamond", Georgia, serif`,
    fontWeight: 700,
  });

  ticketContext.fillStyle = STORY_SCRAPBOOK_SOFT_INK;
  ticketContext.font = `700 ${citySize}px "Cormorant Garamond", Georgia, serif`;
  ticketContext.textAlign = "left";
  ticketContext.textBaseline = "top";
  ticketContext.fillText(city.toUpperCase(), 132, 22);
  ticketContext.fillStyle = STORY_SCRAPBOOK_INK;
  ticketContext.font = `700 ${regionSize}px "Cormorant Garamond", Georgia, serif`;
  ticketContext.fillText(region.toUpperCase(), 132, 44);

  context.save();
  context.shadowBlur = 14;
  context.shadowOffsetY = 8;
  context.shadowColor = "rgba(41, 21, 18, 0.1)";
  context.drawImage(canvas, centerX - canvas.width / 2, centerY - canvas.height / 2);
  context.shadowColor = "transparent";
  context.drawImage(canvas, centerX - canvas.width / 2, centerY - canvas.height / 2);
  context.restore();
}

function drawStoryScrapbookTemplateSlot({
  context,
  image,
  slot,
  fallbackColor,
}: {
  context: CanvasRenderingContext2D;
  image: HTMLImageElement | null;
  slot: StoryScrapbookTemplateSlotAsset;
  fallbackColor: string;
}) {
  const { canvas: slotCanvas, context: slotContext } = createCanvasContext(slot.width, slot.height);

  if (image) {
    const zoom = slot.zoom ?? 1.04;
    const focalX = slot.focalX ?? 0.5;
    const focalY = slot.focalY ?? 0.45;
    const scale = Math.max(slot.width / image.width, slot.height / image.height) * zoom;
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const overflowX = Math.max(0, drawWidth - slot.width);
    const overflowY = Math.max(0, drawHeight - slot.height);
    const drawX = -overflowX * focalX;
    const drawY = -overflowY * focalY;

    slotContext.filter = "saturate(0.97) contrast(0.98) brightness(1.02)";
    slotContext.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    slotContext.filter = "none";

    const gloss = slotContext.createLinearGradient(0, 0, 0, slot.height);
    gloss.addColorStop(0, "rgba(255,255,255,0.12)");
    gloss.addColorStop(0.28, "rgba(255,248,242,0.04)");
    gloss.addColorStop(1, "rgba(78,54,36,0.06)");
    slotContext.fillStyle = gloss;
    slotContext.fillRect(0, 0, slot.width, slot.height);
  } else {
    const fallback = slotContext.createLinearGradient(0, 0, slot.width, slot.height);
    fallback.addColorStop(0, rgba(fallbackColor, 0.8));
    fallback.addColorStop(1, "rgba(255,255,255,0.62)");
    slotContext.fillStyle = fallback;
    slotContext.fillRect(0, 0, slot.width, slot.height);
  }

  slotContext.globalCompositeOperation = "destination-in";
  slotContext.drawImage(slot.maskCanvas, 0, 0, slot.width, slot.height);
  slotContext.globalCompositeOperation = "source-over";
  context.drawImage(slotCanvas, slot.x, slot.y, slot.width, slot.height);
}

async function renderStoryScrapbookBlob({
  data,
}: {
  data: PosterCaptureData;
}) {
  const format = getPosterExportFormat("story");
  const { canvas, context } = createCanvasContext(format.width, format.height);

  await ensureFontsReady();
  drawStoryScrapbookPaperBackground(context, canvas.width, canvas.height);

  const [templateAssets, loadedImages] = await Promise.all([
    loadStoryScrapbookTemplateAssets(canvas.width, canvas.height),
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

  templateAssets.slots.forEach((slot, index) => {
    drawStoryScrapbookTemplateSlot({
      context,
      image: loadedImages[index] ?? null,
      slot,
      fallbackColor: data.posterTone || STORY_SCRAPBOOK_GREEN,
    });
  });

  context.drawImage(templateAssets.overlay, 0, 0, canvas.width, canvas.height);

  const titleFontFamily = `"Arial Rounded MT Bold", "Arial Black", ui-sans-serif, system-ui, sans-serif`;
  const serifFontFamily = `"Cormorant Garamond", Georgia, serif`;
  const titleStartX = 88;
  const titleGap = 26;
  const titleTopY = 148;
  const titleSecondLineY = 286;
  const colorWord = data.missionColorName.toUpperCase();
  const theText = "THE";
  const huntText = "HUNT";

  context.save();
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillStyle = STORY_SCRAPBOOK_INK;
  context.font = "700 18px ui-sans-serif, system-ui, sans-serif";
  setCanvasLetterSpacing(context, "0.18em");
  context.fillText("COLOR HUNT SOCIAL CLUB", 88, 76);
  setCanvasLetterSpacing(context, "0px");

  context.font = `italic 400 24px ${serifFontFamily}`;
  context.fillStyle = "rgba(75, 87, 112, 0.64)";
  context.fillText("summer scrapbook chapter", 88, 116);

  const theSize = fitFontSizeToWidth({
    context,
    text: theText,
    maxWidth: 280,
    initialSize: 118,
    minSize: 86,
    fontFamily: titleFontFamily,
    fontWeight: 700,
  });
  const colorSize = fitFontSizeToWidth({
    context,
    text: colorWord,
    maxWidth: 660,
    initialSize: 118,
    minSize: 76,
    fontFamily: titleFontFamily,
    fontWeight: 700,
  });
  const huntSize = fitFontSizeToWidth({
    context,
    text: huntText,
    maxWidth: 420,
    initialSize: 118,
    minSize: 82,
    fontFamily: titleFontFamily,
    fontWeight: 700,
  });

  context.lineJoin = "round";
  context.miterLimit = 2;
  context.shadowBlur = 10;
  context.shadowOffsetY = 7;
  context.shadowColor = "rgba(34, 24, 18, 0.18)";

  context.font = `700 ${theSize}px ${titleFontFamily}`;
  const theWidth = context.measureText(theText).width;
  drawStrokedFillText({
    context,
    text: theText,
    x: titleStartX,
    y: titleTopY,
    fillStyle: STORY_SCRAPBOOK_PINK,
    strokeStyle: STORY_SCRAPBOOK_WHITE,
    strokeWidth: 18,
  });

  context.font = `700 ${colorSize}px ${titleFontFamily}`;
  drawStrokedFillText({
    context,
    text: colorWord,
    x: titleStartX + theWidth + titleGap,
    y: titleTopY,
    fillStyle: data.posterTone || STORY_SCRAPBOOK_GREEN,
    strokeStyle: STORY_SCRAPBOOK_WHITE,
    strokeWidth: 18,
  });

  context.font = `700 ${huntSize}px ${titleFontFamily}`;
  drawStrokedFillText({
    context,
    text: huntText,
    x: titleStartX,
    y: titleSecondLineY,
    fillStyle: STORY_SCRAPBOOK_GREEN,
    strokeStyle: STORY_SCRAPBOOK_WHITE,
    strokeWidth: 18,
  });

  const subtitleText = `Exploring ${data.locationLabel} · ${data.tripYear}`;
  const subtitleSize = fitFontSizeToWidth({
    context,
    text: subtitleText,
    maxWidth: 760,
    initialSize: 32,
    minSize: 22,
    fontFamily: serifFontFamily,
    fontWeight: 400,
  });
  context.shadowColor = "transparent";
  context.font = `400 ${subtitleSize}px ${serifFontFamily}`;
  context.fillStyle = "rgba(75, 87, 112, 0.72)";
  context.fillText(subtitleText, 88, 432);
  context.restore();

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Couldn't prepare the scrapbook poster image."));
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
