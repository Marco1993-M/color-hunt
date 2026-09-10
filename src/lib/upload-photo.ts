import type { SupabaseClient } from "@supabase/supabase-js";
import type { Photo } from "./types";

/** Storage paths are immutable. A failed metadata write must not overwrite the old photo. */
export async function savePhotoUpload({ supabase, bucketName, userId, tripId, missionId, slot, file, existingPhoto, uploadId }: {
  supabase: SupabaseClient; bucketName: string; userId: string; tripId: string; missionId: string;
  slot: number; file: Blob; existingPhoto?: Photo | null; uploadId?: string;
}): Promise<Photo> {
  const id = existingPhoto?.id ?? uploadId ?? crypto.randomUUID();
  const storagePath = `${userId}/${tripId}/${missionId}/${crypto.randomUUID()}.webp`;
  const { error: uploadError } = await supabase.storage.from(bucketName).upload(storagePath, file, {
    contentType: "image/webp", cacheControl: "3600", upsert: false,
  });
  if (uploadError) throw uploadError;
  const values = { image_url: null, storage_path: storagePath, sort_order: slot,
    poster_focal_x: 0.5, poster_focal_y: 0.5, poster_zoom: 1, photo_filter: "none" };
  const result = existingPhoto
    ? await supabase.from("photos").update(values).eq("id", id).eq("user_id", userId)
      .eq("storage_path", existingPhoto.storage_path).select("*").single()
    : await supabase.from("photos").insert({ ...values, id, user_id: userId, trip_id: tripId, mission_id: missionId }).select("*").single();
  let saved = result.data as Photo | null;
  if (result.error || !saved) {
    // A lost response may follow a successful commit: reconcile before deleting an object.
    const check = await supabase.from("photos").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
    if (check.data?.storage_path === storagePath) saved = check.data as Photo;
    else {
      if (!check.error) await supabase.storage.from(bucketName).remove([storagePath]);
      throw result.error ?? new Error("The photo changed in another tab.");
    }
  }
  if (existingPhoto) await supabase.storage.from(bucketName).remove([existingPhoto.storage_path]).catch(() => undefined);
  const signed = await supabase.storage.from(bucketName).createSignedUrl(storagePath, 3600).catch(() => ({ data: null }));
  return { ...saved!, image_url: signed.data?.signedUrl ?? null };
}
