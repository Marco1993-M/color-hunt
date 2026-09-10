import { createAdminClient } from "@/lib/admin-supabase";
import { getSupabaseEnv } from "@/lib/env";
import type { Photo } from "@/lib/types";

/** Call only after the containing trip or group has passed authorization. */
export async function signPhotoUrls(photos: Photo[]): Promise<Photo[]> {
  if (!photos.length) return [];
  const { data, error } = await createAdminClient().storage.from(getSupabaseEnv().storageBucket)
    .createSignedUrls(photos.map(photo => photo.storage_path), 3600);
  if (error) throw error;
  return photos.map((photo, index) => ({ ...photo, image_url: data?.[index]?.signedUrl || null }));
}
