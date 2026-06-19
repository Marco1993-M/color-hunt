import { getSupabaseEnv } from "@/lib/env";
import type { Photo } from "@/lib/types";

export function getPhotoUrl(photo: Photo) {
  if (photo.image_url) {
    return photo.image_url;
  }

  const { url, storageBucket } = getSupabaseEnv();
  return `${url}/storage/v1/object/public/${storageBucket}/${photo.storage_path}`;
}
