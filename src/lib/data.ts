import { getSupabaseEnv } from "@/lib/env";
import type { Mission, Photo, Trip } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

type SupabaseErrorLike = {
  code?: string;
};

function isMissingSortOrderColumn(error: SupabaseErrorLike | null | undefined) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

function isMissingTripShareColumns(error: SupabaseErrorLike | null | undefined) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

export type TripBundle = {
  trip: Trip;
  mission: Mission;
  photos: Photo[];
};

function sortPhotosByDisplayOrder(photos: Photo[]) {
  return [...photos].sort((left, right) => {
    if (left.sort_order != null && right.sort_order != null) {
      return left.sort_order - right.sort_order;
    }

    if (left.sort_order != null) {
      return -1;
    }

    if (right.sort_order != null) {
      return 1;
    }

    if (left.created_at === right.created_at) {
      return left.id.localeCompare(right.id);
    }

    return left.created_at.localeCompare(right.created_at);
  });
}

export async function ensureProfile(user: { id: string; email?: string | null }) {
  const supabase = await createClient();

  await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email ?? null,
    },
    { onConflict: "id" },
  );
}

export async function getTripsForUser(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select("id, user_id, title, location, start_date, end_date, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Trip[];
}

export async function getTripBundle(tripId: string, userId: string) {
  const supabase = await createClient();
  const [{ data: trip }, { data: mission }, photosResult] = await Promise.all([
    supabase
      .from("trips")
      .select("id, user_id, title, location, start_date, end_date, created_at")
      .eq("id", tripId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("missions")
      .select("id, trip_id, color_name, color_hex, prompt, max_photos, created_at")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("photos")
      .select("id, trip_id, mission_id, user_id, image_url, storage_path, sort_order, caption, dominant_color, color_match_score, created_at")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
  ]);

  let photos = photosResult.data;
  let photosError = photosResult.error as SupabaseErrorLike | null;

  if (isMissingSortOrderColumn(photosError)) {
    const fallbackResult = await supabase
      .from("photos")
      .select("id, trip_id, mission_id, user_id, image_url, storage_path, caption, dominant_color, color_match_score, created_at")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    photos = (fallbackResult.data ?? []).map((photo) => ({
      ...photo,
      sort_order: null,
    })) as Photo[];
    photosError = fallbackResult.error;
  }

  if (photosError) {
    throw photosError;
  }

  if (!trip || !mission) {
    return null;
  }

  return {
    trip,
    mission,
    photos: sortPhotosByDisplayOrder((photos ?? []) as Photo[]),
  };
}

export async function getTripShareState(tripId: string, userId: string) {
  const supabase = await createClient();
  const result = await supabase
    .from("trips")
    .select("share_id, is_public")
    .eq("id", tripId)
    .eq("user_id", userId)
    .maybeSingle();

  if (isMissingTripShareColumns(result.error)) {
    return {
      shareId: null,
      isPublic: false,
      schemaReady: false,
    };
  }

  if (result.error) {
    throw result.error;
  }

  return {
    shareId: result.data?.share_id ?? null,
    isPublic: result.data?.is_public ?? false,
    schemaReady: true,
  };
}

export async function getPublicTripBundleByShareId(shareId: string): Promise<TripBundle | null> {
  const supabase = await createClient();
  const tripResult = await supabase
    .from("trips")
    .select("id, user_id, title, location, start_date, end_date, share_id, is_public, created_at")
    .eq("share_id", shareId)
    .eq("is_public", true)
    .maybeSingle();

  const trip = tripResult.data;
  const tripError = tripResult.error as SupabaseErrorLike | null;

  if (isMissingTripShareColumns(tripError)) {
    return null;
  }

  if (tripError) {
    throw tripError;
  }

  if (!trip) {
    return null;
  }

  const [missionResult, photosResult] = await Promise.all([
    supabase
      .from("missions")
      .select("id, trip_id, color_name, color_hex, prompt, max_photos, created_at")
      .eq("trip_id", trip.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("photos")
      .select("id, trip_id, mission_id, user_id, image_url, storage_path, sort_order, caption, dominant_color, color_match_score, created_at")
      .eq("trip_id", trip.id)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
  ]);

  const mission = missionResult.data;

  if (missionResult.error) {
    throw missionResult.error;
  }

  if (!mission) {
    return null;
  }

  let photos = photosResult.data;
  let photosError = photosResult.error as SupabaseErrorLike | null;

  if (isMissingSortOrderColumn(photosError)) {
    const fallbackResult = await supabase
      .from("photos")
      .select("id, trip_id, mission_id, user_id, image_url, storage_path, caption, dominant_color, color_match_score, created_at")
      .eq("trip_id", trip.id)
      .order("created_at", { ascending: true });

    photos = (fallbackResult.data ?? []).map((photo) => ({
      ...photo,
      sort_order: null,
    })) as Photo[];
    photosError = fallbackResult.error;
  }

  if (photosError) {
    throw photosError;
  }

  return {
    trip: trip as Trip,
    mission: mission as Mission,
    photos: sortPhotosByDisplayOrder((photos ?? []) as Photo[]),
  };
}

export function getPhotoUrl(photo: Photo) {
  if (photo.image_url) {
    return photo.image_url;
  }

  const { url, storageBucket } = getSupabaseEnv();
  return `${url}/storage/v1/object/public/${storageBucket}/${photo.storage_path}`;
}
