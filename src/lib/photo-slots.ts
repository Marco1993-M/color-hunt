import type { Photo } from "./types";

export function getPhotoSlots(photos: Photo[], maxPhotos: number) {
  const slots: Array<Photo | null> = Array.from({ length: maxPhotos }, () => null);
  for (const [index, photo] of photos.entries()) {
    const slot = photo.sort_order ?? index;
    if (Number.isInteger(slot) && slot >= 0 && slot < maxPhotos && !slots[slot]) slots[slot] = photo;
  }
  return slots;
}

export function selectImageFiles(files: File[]) {
  const accepted = files.filter(file => ["image/jpeg", "image/png", "image/webp"].includes(file.type));
  return { accepted, rejected: files.length - accepted.length };
}

export function photoErrorMessage(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  if (code === "23505") return "This frame was filled in another tab. Your grid has been refreshed; choose an empty frame.";
  if (code === "23514") return "This frame is no longer available. Refresh your grid and try again.";
  return "We couldn't save that photo. Check your connection and try again. Photos already added are safe.";
}

// Keep an upload identity across retries of the same selected File, even if a response was lost.
const fileUploadIds = new WeakMap<File, string>();
export function getFileUploadId(file: File) {
  let id = fileUploadIds.get(file);
  if (!id) { id = crypto.randomUUID(); fileUploadIds.set(file, id); }
  return id;
}
