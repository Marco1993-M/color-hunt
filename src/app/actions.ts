"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/admin-supabase";
import { ensureProfile } from "@/lib/data";
import { getSupabaseEnv } from "@/lib/env";
import { getMissionByColorName, getRandomMission } from "@/lib/missions";
import { getPosterExportBucketName } from "@/lib/poster-cache";
import { trackServerEvent } from "@/lib/server-analytics";
import { createClient } from "@/lib/supabase/server";

export async function createTripAction(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const startDate = String(formData.get("start_date") || "").trim();
  const endDate = String(formData.get("end_date") || "").trim();
  const selectedColor = String(formData.get("color_name") || "random").trim();
  const challengeShareId = String(formData.get("challenge_share_id") || "").trim();
  const challengeColorName = String(formData.get("challenge_color_name") || "").trim();

  if (!title || !location) {
    throw new Error("Trip title and location are required.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  await ensureProfile(user);
  const mission = selectedColor === "random" ? getRandomMission() : getMissionByColorName(selectedColor);

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .insert({
      user_id: user.id,
      title,
      location,
      start_date: startDate || null,
      end_date: endDate || null,
    })
    .select("id")
    .single();

  if (tripError || !trip) {
    throw tripError ?? new Error("Unable to create trip.");
  }

  const { error: missionError } = await supabase.from("missions").insert({
    trip_id: trip.id,
    color_name: mission.color_name,
    color_hex: mission.color_hex,
    prompt: mission.prompt,
    max_photos: 9,
  });

  if (missionError) {
    throw missionError;
  }

  await trackServerEvent({
    eventName: "trip_created",
    tripId: trip.id,
    userId: user.id,
    path: `/trips/${trip.id}`,
    metadata: {
      location,
      selectedColor,
      assignedColor: mission.color_name,
      challengeColorName: challengeColorName || null,
      challengeShareId: challengeShareId || null,
      maxPhotos: 9,
    },
  });

  revalidatePath("/dashboard");
  redirect(`/trips/${trip.id}`);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function deleteTripAction(formData: FormData) {
  const tripId = String(formData.get("trip_id") || "").trim();

  if (!tripId) {
    throw new Error("Trip ID is required.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id, title, location, share_id")
    .eq("id", tripId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (tripError) {
    throw tripError;
  }

  if (!trip) {
    throw new Error("This hunt could not be found.");
  }

  const [photosResult, exportsResult] = await Promise.all([
    supabase.from("photos").select("storage_path").eq("trip_id", tripId),
    supabase.from("poster_exports").select("storage_path").eq("trip_id", tripId),
  ]);

  if (photosResult.error) {
    throw photosResult.error;
  }

  if (exportsResult.error) {
    throw exportsResult.error;
  }

  const photoPaths = (photosResult.data ?? []).map((photo) => photo.storage_path).filter(Boolean);
  const exportPaths = (exportsResult.data ?? []).map((posterExport) => posterExport.storage_path).filter(Boolean);

  const admin = createAdminClient();
  const photoBucket = getSupabaseEnv().storageBucket;
  const exportBucket = getPosterExportBucketName();

  if (photoPaths.length > 0) {
    const { error: photoStorageError } = await admin.storage.from(photoBucket).remove(photoPaths);

    if (photoStorageError) {
      throw photoStorageError;
    }
  }

  if (exportPaths.length > 0) {
    const { error: exportStorageError } = await admin.storage.from(exportBucket).remove(exportPaths);

    if (exportStorageError) {
      throw exportStorageError;
    }
  }

  const { error: deleteError } = await supabase.from("trips").delete().eq("id", tripId).eq("user_id", user.id);

  if (deleteError) {
    throw deleteError;
  }

  await trackServerEvent({
    eventName: "trip_deleted",
    tripId,
    userId: user.id,
    path: "/dashboard",
    metadata: {
      location: trip.location,
      shareId: trip.share_id ?? null,
      title: trip.title,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/trips/${tripId}`);
  if (trip.share_id) {
    revalidatePath(`/poster/${trip.share_id}`);
  }

  redirect("/dashboard");
}
