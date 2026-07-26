import { POSTER_FRAME_COUNT } from "@/lib/poster";

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const retentionPolicy = {
  emptyDraftHours: readPositiveInteger(process.env.COLOR_HUNT_RETENTION_EMPTY_DRAFT_HOURS, 24),
  incompleteDays: readPositiveInteger(process.env.COLOR_HUNT_RETENTION_INCOMPLETE_DAYS, 30),
  completePrivateDays: readPositiveInteger(process.env.COLOR_HUNT_RETENTION_COMPLETE_PRIVATE_DAYS, 90),
  publicDays: readPositiveInteger(process.env.COLOR_HUNT_RETENTION_PUBLIC_DAYS, 365),
  defaultMaxPhotos: POSTER_FRAME_COUNT,
} as const;

export function getRetentionDays({
  isPublic,
  photoCount,
  maxPhotos,
}: {
  isPublic: boolean;
  photoCount: number;
  maxPhotos: number;
}) {
  if (isPublic) {
    return retentionPolicy.publicDays;
  }

  return photoCount >= maxPhotos ? retentionPolicy.completePrivateDays : retentionPolicy.incompleteDays;
}

export function getRetentionSummaryLabel({
  isPublic,
  photoCount,
  maxPhotos,
}: {
  isPublic: boolean;
  photoCount: number;
  maxPhotos: number;
}) {
  if (isPublic) {
    return `public posters are kept for ${retentionPolicy.publicDays} days`;
  }

  return photoCount >= maxPhotos
    ? `completed private trips are kept for ${retentionPolicy.completePrivateDays} days`
    : `incomplete trips are kept for ${retentionPolicy.incompleteDays} days`;
}
