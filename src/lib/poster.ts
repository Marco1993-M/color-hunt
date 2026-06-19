import type { Photo } from "@/lib/types";

export const POSTER_FRAME_COUNT = 9;

export type PosterPhotoPlacement = {
  focalX: number;
  focalY: number;
  zoom: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isNormalizedPlacement(
  value: Pick<Photo, "poster_focal_x" | "poster_focal_y" | "poster_zoom"> | PosterPhotoPlacement | null | undefined,
): value is PosterPhotoPlacement {
  if (!value) {
    return false;
  }

  return "focalX" in value && "focalY" in value && "zoom" in value;
}

export function getPosterPhotoPlacement(
  photo:
    | Pick<Photo, "poster_focal_x" | "poster_focal_y" | "poster_zoom">
    | PosterPhotoPlacement
    | null
    | undefined,
): PosterPhotoPlacement {
  if (isNormalizedPlacement(photo)) {
    return {
      focalX: clamp(Number(photo.focalX ?? 0.5), 0, 1),
      focalY: clamp(Number(photo.focalY ?? 0.5), 0, 1),
      zoom: clamp(Number(photo.zoom ?? 1), 1, 2.5),
    };
  }

  return {
    focalX: clamp(Number(photo?.poster_focal_x ?? 0.5), 0, 1),
    focalY: clamp(Number(photo?.poster_focal_y ?? 0.5), 0, 1),
    zoom: clamp(Number(photo?.poster_zoom ?? 1), 1, 2.5),
  };
}

export function getPosterTripYear(createdAt: string, startDate: string | null, endDate: string | null) {
  return startDate?.slice(0, 4) || endDate?.slice(0, 4) || new Date(createdAt).getUTCFullYear().toString();
}

export function getPosterLocationLabel(location: string) {
  return location.toUpperCase();
}

export function getPosterTitleLabel(title: string | null | undefined, location: string) {
  const normalizedTitle = String(title || "").trim();

  if (normalizedTitle) {
    return normalizedTitle.toUpperCase();
  }

  return getPosterLocationLabel(location);
}

export function getPosterSubtitle(colorName: string | null | undefined) {
  const normalizedColor = String(colorName || "").trim();

  if (!normalizedColor) {
    return "A color story in nine frames";
  }

  return `A ${normalizedColor} story in nine frames`;
}

export function buildPosterFrameSlots<T>(items: T[], frameCount = POSTER_FRAME_COUNT) {
  return Array.from({ length: frameCount }, (_, index) => items[index] ?? null);
}

export function buildPosterPhotoPlacements(photos: Photo[], frameCount = POSTER_FRAME_COUNT) {
  return buildPosterFrameSlots(photos, frameCount).map((photo) => (photo ? getPosterPhotoPlacement(photo) : null));
}

export function isPosterComplete(photos: Photo[], maxPhotos = POSTER_FRAME_COUNT) {
  return photos.length >= maxPhotos;
}
