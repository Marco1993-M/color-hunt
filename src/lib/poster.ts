import type { Photo } from "@/lib/types";

export const POSTER_FRAME_COUNT = 9;

export function getPosterTripYear(createdAt: string, startDate: string | null, endDate: string | null) {
  return startDate?.slice(0, 4) || endDate?.slice(0, 4) || new Date(createdAt).getUTCFullYear().toString();
}

export function getPosterLocationLabel(location: string) {
  return location.toUpperCase();
}

export function buildPosterFrameSlots<T>(items: T[], frameCount = POSTER_FRAME_COUNT) {
  return Array.from({ length: frameCount }, (_, index) => items[index] ?? null);
}

export function isPosterComplete(photos: Photo[], maxPhotos = POSTER_FRAME_COUNT) {
  return photos.length >= maxPhotos;
}
