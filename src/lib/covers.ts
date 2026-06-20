import type { Mission, Trip } from "@/lib/types";

export type CoverTemplateId = "june" | "july" | "august" | "usa";

export type CoverTemplate = {
  id: CoverTemplateId;
  label: string;
  description: string;
  themeId: "post-june" | "post-july" | "post-august" | "post-usa";
  overlaySrc: string;
  photoCount: number;
  slots: Array<{
    left: number;
    top: number;
    width: number;
    height: number;
  }>;
};

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
    slots: [...twoByTwoSlots],
  },
  {
    id: "july",
    label: "July cover",
    description: "Editorial 2x2 cover",
    themeId: "post-july",
    overlaySrc: "/poster-template-story-july.png",
    photoCount: 4,
    slots: [...twoByTwoSlots],
  },
  {
    id: "august",
    label: "August cover",
    description: "Editorial 2x2 cover",
    themeId: "post-august",
    overlaySrc: "/poster-template-story-august.png",
    photoCount: 4,
    slots: [...twoByTwoSlots],
  },
  {
    id: "usa",
    label: "USA cover",
    description: "Stars-and-stripes cover",
    themeId: "post-usa",
    overlaySrc: "/poster-template-story-usa.png",
    photoCount: 4,
    slots: [...twoByTwoSlots],
  },
];

export function isCoverTemplateId(value: string | null | undefined): value is CoverTemplateId {
  return value === "june" || value === "july" || value === "august" || value === "usa";
}

export function getCoverTemplate(templateId: string | null | undefined) {
  return coverTemplates.find((template) => template.id === templateId) ?? coverTemplates[0];
}

export function getCoverThemeId(templateId: string | null | undefined) {
  return getCoverTemplate(templateId).themeId;
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
    trip.cover_template === "june" ||
    trip.cover_template === "july" ||
    trip.cover_template === "august" ||
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
