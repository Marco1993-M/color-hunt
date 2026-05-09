export const posterExportFormats = [
  {
    id: "post",
    label: "Post",
    description: "Instagram 4:5",
    width: 1080,
    height: 1350,
    fileSuffix: "post-4x5",
  },
  {
    id: "story",
    label: "Story",
    description: "Instagram Story",
    width: 1080,
    height: 1920,
    fileSuffix: "story-9x16",
  },
  {
    id: "square",
    label: "Square",
    description: "Instagram square",
    width: 1080,
    height: 1080,
    fileSuffix: "square-1x1",
  },
] as const;

export type PosterExportFormatId = (typeof posterExportFormats)[number]["id"];
export type PosterExportFormat = (typeof posterExportFormats)[number];

export function getPosterExportFormat(formatId: string | null | undefined) {
  return posterExportFormats.find((format) => format.id === formatId) ?? posterExportFormats[0];
}

export function slugifyPosterFileLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
