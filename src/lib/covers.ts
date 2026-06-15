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
