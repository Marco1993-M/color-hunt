import type { Mission, Trip } from "@/lib/types";

export type CoverTemplateId = "july" | "usa";

export type CoverTemplate = {
  id: CoverTemplateId;
  label: string;
  description: string;
  themeId: "post-july" | "post-usa";
  overlaySrc: string;
};

export const coverTemplates: CoverTemplate[] = [
  {
    id: "july",
    label: "July cover",
    description: "Editorial 2x2 cover",
    themeId: "post-july",
    overlaySrc: "/poster-template-story-july.png",
  },
  {
    id: "usa",
    label: "USA cover",
    description: "Stars-and-stripes cover",
    themeId: "post-usa",
    overlaySrc: "/poster-template-story-usa.png",
  },
];

export function getCoverTemplate(templateId: string | null | undefined) {
  return coverTemplates.find((template) => template.id === templateId) ?? coverTemplates[0];
}

export function getCoverThemeId(templateId: string | null | undefined) {
  return getCoverTemplate(templateId).themeId;
}

export function inferCoverTemplateId({
  trip,
  mission,
}: {
  trip: Pick<Trip, "cover_template" | "location">;
  mission?: Pick<Mission, "max_photos" | "prompt" | "color_name"> | null;
}) {
  if (trip.cover_template === "july" || trip.cover_template === "usa") {
    return trip.cover_template;
  }

  const location = String(trip.location || "").toLowerCase();
  const prompt = String(mission?.prompt || "").toLowerCase();
  const colorName = String(mission?.color_name || "").toLowerCase();

  if (location.includes("usa") || prompt.includes("usa") || colorName.includes("usa")) {
    return "usa" as const;
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
