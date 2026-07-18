import type { Mission, Trip } from "@/lib/types";

export type CoverTemplateId = "june" | "july" | "august" | "summer-2026" | "usa" | "custom-title";

export type CoverTemplate = {
  id: CoverTemplateId;
  label: string;
  description: string;
  themeId: "classic" | "post-june" | "post-july" | "post-august" | "post-summer-2026" | "post-usa";
  overlaySrc?: string;
  isCustomTitle?: boolean;
  photoCount: number;
  gridColumns: number;
  slots: Array<{
    left: number;
    top: number;
    width: number;
    height: number;
  }>;
};

export const maxCustomCoverTitleLength = 10;
export const maxCustomCoverTitleLineLength = 10;

const twoByTwoSlots = [
  { left: 0, top: 0, width: 0.5, height: 0.5 },
  { left: 0.5, top: 0, width: 0.5, height: 0.5 },
  { left: 0, top: 0.5, width: 0.5, height: 0.5 },
  { left: 0.5, top: 0.5, width: 0.5, height: 0.5 },
] as const;

export const coverTemplates: CoverTemplate[] = [
  {
    id: "june",
    label: "June cover",
    description: "Editorial 2x2 cover",
    themeId: "post-june",
    overlaySrc: "/poster-template-story-june.png",
    photoCount: 4,
    gridColumns: 2,
    slots: [...twoByTwoSlots],
  },
  {
    id: "july",
    label: "July cover",
    description: "Editorial 2x2 cover",
    themeId: "post-july",
    overlaySrc: "/poster-template-story-july.png",
    photoCount: 4,
    gridColumns: 2,
    slots: [...twoByTwoSlots],
  },
  {
    id: "august",
    label: "August cover",
    description: "Editorial 2x2 cover",
    themeId: "post-august",
    overlaySrc: "/poster-template-story-august.png",
    photoCount: 4,
    gridColumns: 2,
    slots: [...twoByTwoSlots],
  },
  {
    id: "summer-2026",
    label: "Summer 2026 cover",
    description: "Four-frame summer cover",
    themeId: "post-summer-2026",
    overlaySrc: "/poster-template-story-summer_2026.png",
    photoCount: 4,
    gridColumns: 2,
    slots: [...twoByTwoSlots],
  },
  {
    id: "usa",
    label: "USA cover",
    description: "Stars-and-stripes cover",
    themeId: "post-usa",
    overlaySrc: "/poster-template-story-usa.png",
    photoCount: 4,
    gridColumns: 2,
    slots: [...twoByTwoSlots],
  },
  {
    id: "custom-title",
    label: "Custom title cover",
    description: "Build a cover around your own title",
    themeId: "classic",
    isCustomTitle: true,
    photoCount: 4,
    gridColumns: 2,
    slots: [...twoByTwoSlots],
  },
];

export function isCoverTemplateId(value: string | null | undefined): value is CoverTemplateId {
  return value === "custom-title" || value === "june" || value === "july" || value === "august" || value === "summer-2026" || value === "usa";
}

export function getCoverTemplate(templateId: string | null | undefined) {
  return coverTemplates.find((template) => template.id === templateId) ?? coverTemplates[0];
}

export function getCoverThemeId(templateId: string | null | undefined) {
  return getCoverTemplate(templateId).themeId;
}

export function getCoverGridColumns(photoCount: number) {
  return photoCount === 6 ? 3 : 2;
}

export function getCoverTemplateSlots(templateId: string | null | undefined, photoCount: number) {
  const template = getCoverTemplate(templateId);

  if (photoCount !== 6) {
    return template.slots;
  }

  return [
    { left: 0, top: 0, width: 1 / 3, height: 0.5 },
    { left: 1 / 3, top: 0, width: 1 / 3, height: 0.5 },
    { left: 2 / 3, top: 0, width: 1 / 3, height: 0.5 },
    { left: 0, top: 0.5, width: 1 / 3, height: 0.5 },
    { left: 1 / 3, top: 0.5, width: 1 / 3, height: 0.5 },
    { left: 2 / 3, top: 0.5, width: 1 / 3, height: 0.5 },
  ];
}

export function getCoverDisplayTitle(title: string | null | undefined) {
  const normalized = String(title || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

  return normalized || "COVER";
}

export function getCoverDisplayTitleLines(title: string | null | undefined, maxLines = 3) {
  const normalized = getCoverDisplayTitle(title);
  const words = normalized.split(" ").filter(Boolean);

  if (words.length <= 1) {
    return [normalized];
  }

  const lineLimit = Math.max(1, Math.min(maxLines, words.length));
  let bestLines = [normalized];
  let bestScore = Number.POSITIVE_INFINITY;

  function scoreLines(lines: string[]) {
    const lengths = lines.map((line) => line.length);
    const longest = Math.max(...lengths);
    const shortest = Math.min(...lengths);
    const average = lengths.reduce((sum, value) => sum + value, 0) / lengths.length;

    return longest * 4 + (longest - shortest) * 3 + Math.abs(average - 8) * 1.5;
  }

  function buildPartitions(startIndex: number, remainingLines: number, currentLines: string[]) {
    if (startIndex >= words.length) {
      const nextScore = scoreLines(currentLines);
      if (nextScore < bestScore) {
        bestScore = nextScore;
        bestLines = currentLines;
      }
      return;
    }

    if (remainingLines === 1) {
      buildPartitions(words.length, 0, [...currentLines, words.slice(startIndex).join(" ")]);
      return;
    }

    for (let endIndex = startIndex + 1; endIndex <= words.length - (remainingLines - 1); endIndex += 1) {
      buildPartitions(endIndex, remainingLines - 1, [...currentLines, words.slice(startIndex, endIndex).join(" ")]);
    }
  }

  for (let lineCount = 2; lineCount <= lineLimit; lineCount += 1) {
    buildPartitions(0, lineCount, []);
  }

  return bestLines;
}

export function inferCoverTemplateId({
  trip,
  mission,
}: {
  trip: Pick<Trip, "cover_template" | "location">;
  mission?: Pick<Mission, "max_photos" | "prompt" | "color_name"> | null;
}) {
  if (
    trip.cover_template === "custom-title" ||
    trip.cover_template === "june" ||
    trip.cover_template === "july" ||
    trip.cover_template === "august" ||
    trip.cover_template === "summer-2026" ||
    trip.cover_template === "usa"
  ) {
    return trip.cover_template;
  }

  const location = String(trip.location || "").toLowerCase();
  const prompt = String(mission?.prompt || "").toLowerCase();
  const colorName = String(mission?.color_name || "").toLowerCase();

  if (location.includes("usa") || prompt.includes("usa") || colorName.includes("usa")) {
    return "usa" as const;
  }

  if (location.includes("august") || prompt.includes("august") || colorName.includes("august")) {
    return "august" as const;
  }

  if (location.includes("summer 2026") || prompt.includes("summer 2026") || colorName.includes("summer 2026")) {
    return "summer-2026" as const;
  }

  if (location.includes("june") || prompt.includes("june") || colorName.includes("june")) {
    return "june" as const;
  }

  return "july" as const;
}

export function isCoverTripLike({
  trip,
  mission,
}: {
  trip: Pick<Trip, "creation_mode" | "cover_template" | "location">;
  mission?: Pick<Mission, "max_photos" | "prompt" | "color_name"> | null;
}) {
  if (trip.creation_mode === "cover") {
    return true;
  }

  return (mission?.max_photos ?? 9) === 4;
}
