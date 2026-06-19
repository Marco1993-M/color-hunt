import { getPhotoUrl as getPublicPhotoUrl } from "@/lib/photo-url";
import { createAdminClient } from "@/lib/admin-supabase";
import type {
  GroupHunt,
  GroupHuntParticipant,
  GroupHuntParticipantResult,
  GroupHuntParticipantSeat,
  Mission,
  Photo,
  PosterExport,
  Trip,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

type SupabaseErrorLike = {
  code?: string;
};

function isMissingSortOrderColumn(error: SupabaseErrorLike | null | undefined) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

function isMissingPhotoCropColumns(error: SupabaseErrorLike | null | undefined) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

function isMissingCoverColumns(error: SupabaseErrorLike | null | undefined) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

function isMissingTripShareColumns(error: SupabaseErrorLike | null | undefined) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

function normalizeTrip(trip: Partial<Trip> & Record<string, unknown>) {
  return {
    ...trip,
    creation_mode: trip.creation_mode ?? null,
    cover_template: trip.cover_template ?? null,
  } as Trip;
}

function normalizePhoto(photo: Partial<Photo> & Record<string, unknown>) {
  return {
    ...photo,
    sort_order: photo.sort_order ?? null,
    poster_focal_x: photo.poster_focal_x ?? 0.5,
    poster_focal_y: photo.poster_focal_y ?? 0.5,
    poster_zoom: photo.poster_zoom ?? 1,
  } as Photo;
}

export type TripBundle = {
  trip: Trip;
  mission: Mission;
  photos: Photo[];
};

export type GroupHuntBundle = {
  hunt: GroupHunt;
  participants: GroupHuntParticipantSeat[];
  results: GroupHuntParticipantResult[];
};

export type GroupHuntInviteSeat = {
  hunt: GroupHunt;
  participant: GroupHuntParticipant;
};

export type DashboardTripSummary = {
  trip: Trip;
  mission: Mission | null;
  photoCount: number;
  maxPhotos: number;
  isComplete: boolean;
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
  let result = await supabase
    .from("trips")
    .select("id, user_id, title, location, creation_mode, cover_template, start_date, end_date, group_hunt_id, group_participant_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (isMissingCoverColumns(result.error)) {
    result = (await supabase
      .from("trips")
      .select("id, user_id, title, location, start_date, end_date, group_hunt_id, group_participant_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })) as typeof result;
  }

  if (result.error) {
    throw result.error;
  }

  return (result.data ?? []).map((trip) => normalizeTrip(trip as Trip));
}

export async function getTripDashboardSummaries(userId: string): Promise<DashboardTripSummary[]> {
  const supabase = await createClient();
  const trips = await getTripsForUser(userId);

  if (trips.length === 0) {
    return [];
  }

  const tripIds = trips.map((trip) => trip.id);
  const [{ data: missionRows, error: missionError }, { data: photoRows, error: photoError }] = await Promise.all([
    supabase
      .from("missions")
      .select("id, trip_id, color_name, color_hex, prompt, max_photos, created_at")
      .in("trip_id", tripIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("photos")
      .select("trip_id")
      .in("trip_id", tripIds),
  ]);

  if (missionError) {
    throw missionError;
  }

  if (photoError) {
    throw photoError;
  }

  const missionsByTripId = new Map<string, Mission>();
  for (const mission of (missionRows ?? []) as Mission[]) {
    if (!missionsByTripId.has(mission.trip_id)) {
      missionsByTripId.set(mission.trip_id, mission);
    }
  }

  const photoCountByTripId = new Map<string, number>();
  for (const photo of photoRows ?? []) {
    photoCountByTripId.set(photo.trip_id, (photoCountByTripId.get(photo.trip_id) ?? 0) + 1);
  }

  return trips.map((trip) => {
    const mission = missionsByTripId.get(trip.id) ?? null;
    const maxPhotos = mission?.max_photos ?? (trip.creation_mode === "cover" ? 4 : 9);
    const photoCount = photoCountByTripId.get(trip.id) ?? 0;

    return {
      trip,
      mission,
      photoCount,
      maxPhotos,
      isComplete: photoCount >= maxPhotos,
    };
  });
}

export async function getTripBundle(tripId: string, userId: string) {
  const supabase = await createClient();
  const [tripResult, missionResult, photosResult] = await Promise.all([
    supabase
      .from("trips")
      .select("id, user_id, title, location, creation_mode, cover_template, start_date, end_date, group_hunt_id, group_participant_id, created_at")
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
      .select("id, trip_id, mission_id, user_id, image_url, storage_path, sort_order, poster_focal_x, poster_focal_y, poster_zoom, caption, dominant_color, color_match_score, created_at")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
  ]);

  let trip: Trip | null = tripResult.data ? normalizeTrip(tripResult.data as Trip) : null;
  let tripError = tripResult.error as SupabaseErrorLike | null;

  if (isMissingCoverColumns(tripError)) {
    const fallbackTripResult = (await supabase
      .from("trips")
      .select("id, user_id, title, location, start_date, end_date, group_hunt_id, group_participant_id, created_at")
      .eq("id", tripId)
      .eq("user_id", userId)
      .maybeSingle()) as typeof tripResult;

    trip = fallbackTripResult.data ? normalizeTrip(fallbackTripResult.data as Trip) : null;
    tripError = fallbackTripResult.error;
  }

  if (tripError) {
    throw tripError;
  }

  const mission = missionResult.data;

  if (missionResult.error) {
    throw missionResult.error;
  }

  let photos: Photo[] | null = (photosResult.data ?? []).map((photo) => normalizePhoto(photo as Photo));
  let photosError = photosResult.error as SupabaseErrorLike | null;

  if (isMissingPhotoCropColumns(photosError)) {
    const fallbackResult = await supabase
      .from("photos")
      .select("id, trip_id, mission_id, user_id, image_url, storage_path, sort_order, caption, dominant_color, color_match_score, created_at")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    photos = (fallbackResult.data ?? []).map((photo) => normalizePhoto(photo as Photo));
    photosError = fallbackResult.error as SupabaseErrorLike | null;
  }

  if (isMissingSortOrderColumn(photosError)) {
    const fallbackResult = await supabase
      .from("photos")
      .select("id, trip_id, mission_id, user_id, image_url, storage_path, caption, dominant_color, color_match_score, created_at")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    photos = (fallbackResult.data ?? []).map((photo) => normalizePhoto(photo as Photo));
    photosError = fallbackResult.error;
  }

  if (photosError) {
    throw photosError;
  }

  if (!trip || !mission) {
    const admin = createAdminClient();
    const [adminTripResult, adminMissionResult, adminPhotosResult] = await Promise.all([
      admin
        .from("trips")
        .select("id, user_id, title, location, creation_mode, cover_template, start_date, end_date, group_hunt_id, group_participant_id, created_at")
        .eq("id", tripId)
        .eq("user_id", userId)
        .maybeSingle(),
      admin
        .from("missions")
        .select("id, trip_id, color_name, color_hex, prompt, max_photos, created_at")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("photos")
        .select("id, trip_id, mission_id, user_id, image_url, storage_path, sort_order, poster_focal_x, poster_focal_y, poster_zoom, caption, dominant_color, color_match_score, created_at")
        .eq("trip_id", tripId)
        .eq("user_id", userId)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
    ]);

    let adminTrip = adminTripResult.data ? normalizeTrip(adminTripResult.data as Trip) : null;
    let adminTripError = adminTripResult.error as SupabaseErrorLike | null;

    if (isMissingCoverColumns(adminTripError)) {
      const fallbackAdminTripResult = (await admin
        .from("trips")
        .select("id, user_id, title, location, start_date, end_date, group_hunt_id, group_participant_id, created_at")
        .eq("id", tripId)
        .eq("user_id", userId)
        .maybeSingle()) as typeof adminTripResult;

      adminTrip = fallbackAdminTripResult.data ? normalizeTrip(fallbackAdminTripResult.data as Trip) : null;
      adminTripError = fallbackAdminTripResult.error;
    }

    if (adminTripError) {
      throw adminTripError;
    }

    if (adminMissionResult.error) {
      throw adminMissionResult.error;
    }

    let adminPhotos: Photo[] | null = (adminPhotosResult.data ?? []).map((photo) => normalizePhoto(photo as Photo));
    let adminPhotosError = adminPhotosResult.error as SupabaseErrorLike | null;

    if (isMissingPhotoCropColumns(adminPhotosError)) {
      const fallbackAdminPhotosResult = await admin
        .from("photos")
        .select("id, trip_id, mission_id, user_id, image_url, storage_path, sort_order, caption, dominant_color, color_match_score, created_at")
        .eq("trip_id", tripId)
        .eq("user_id", userId)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });

      adminPhotos = (fallbackAdminPhotosResult.data ?? []).map((photo) => normalizePhoto(photo as Photo));
      adminPhotosError = fallbackAdminPhotosResult.error as SupabaseErrorLike | null;
    }

    if (isMissingSortOrderColumn(adminPhotosError)) {
      const fallbackAdminPhotosResult = await admin
        .from("photos")
        .select("id, trip_id, mission_id, user_id, image_url, storage_path, caption, dominant_color, color_match_score, created_at")
        .eq("trip_id", tripId)
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      adminPhotos = (fallbackAdminPhotosResult.data ?? []).map((photo) => normalizePhoto(photo as Photo));
      adminPhotosError = fallbackAdminPhotosResult.error;
    }

    if (adminPhotosError) {
      throw adminPhotosError;
    }

    if (!adminTrip || !adminMissionResult.data) {
      return null;
    }

    return {
      trip: adminTrip,
      mission: adminMissionResult.data as Mission,
      photos: sortPhotosByDisplayOrder((adminPhotos ?? []).map((photo) => normalizePhoto(photo as Photo))),
    };
  }

  return {
    trip: normalizeTrip(trip as Trip),
    mission,
    photos: sortPhotosByDisplayOrder((photos ?? []).map((photo) => normalizePhoto(photo as Photo))),
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
  let tripResult = await supabase
    .from("trips")
    .select("id, user_id, title, location, creation_mode, cover_template, start_date, end_date, group_hunt_id, group_participant_id, share_id, is_public, created_at")
    .eq("share_id", shareId)
    .eq("is_public", true)
    .maybeSingle();
  const tripError = tripResult.error as SupabaseErrorLike | null;

  if (isMissingTripShareColumns(tripError)) {
    return null;
  }

  if (isMissingCoverColumns(tripError)) {
    tripResult = (await supabase
      .from("trips")
      .select("id, user_id, title, location, start_date, end_date, group_hunt_id, group_participant_id, share_id, is_public, created_at")
      .eq("share_id", shareId)
      .eq("is_public", true)
      .maybeSingle()) as typeof tripResult;
  }

  const trip = tripResult.data ? normalizeTrip(tripResult.data as Trip) : null;
  const normalizedTripError = tripResult.error as SupabaseErrorLike | null;

  if (normalizedTripError) {
    throw normalizedTripError;
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
      .select("id, trip_id, mission_id, user_id, image_url, storage_path, sort_order, poster_focal_x, poster_focal_y, poster_zoom, caption, dominant_color, color_match_score, created_at")
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

  let photos: Photo[] | null = (photosResult.data ?? []).map((photo) => normalizePhoto(photo as Photo));
  let photosError = photosResult.error as SupabaseErrorLike | null;

  if (isMissingPhotoCropColumns(photosError)) {
    const fallbackResult = await supabase
      .from("photos")
      .select("id, trip_id, mission_id, user_id, image_url, storage_path, sort_order, caption, dominant_color, color_match_score, created_at")
      .eq("trip_id", trip.id)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    photos = (fallbackResult.data ?? []).map((photo) => normalizePhoto(photo as Photo));
    photosError = fallbackResult.error as SupabaseErrorLike | null;
  }

  if (isMissingSortOrderColumn(photosError)) {
    const fallbackResult = await supabase
      .from("photos")
      .select("id, trip_id, mission_id, user_id, image_url, storage_path, caption, dominant_color, color_match_score, created_at")
      .eq("trip_id", trip.id)
      .order("created_at", { ascending: true });

    photos = (fallbackResult.data ?? []).map((photo) => normalizePhoto(photo as Photo));
    photosError = fallbackResult.error;
  }

  if (photosError) {
    throw photosError;
  }

  return {
    trip,
    mission: mission as Mission,
    photos: sortPhotosByDisplayOrder((photos ?? []).map((photo) => normalizePhoto(photo as Photo))),
  };
}

export async function getPosterExportForTrip(tripId: string, format: PosterExport["format"]) {
  const supabase = await createClient();
  const result = await supabase
    .from("poster_exports")
    .select("id, trip_id, format, storage_path, image_url, generated_at")
    .eq("trip_id", tripId)
    .eq("format", format)
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return (result.data as PosterExport | null) ?? null;
}

export async function getPublicTripsForSitemap() {
  const supabase = await createClient();
  const result = await supabase
    .from("trips")
    .select("share_id, created_at")
    .eq("is_public", true)
    .not("share_id", "is", null)
    .order("created_at", { ascending: false });

  if (result.error) {
    throw result.error;
  }

  return (result.data ?? []) as Array<{
    share_id: string;
    created_at: string;
  }>;
}

export function getPhotoUrl(photo: Photo) {
  return getPublicPhotoUrl(photo);
}

export async function getGroupHuntsForUser(userId: string) {
  const supabase = await createClient();
  const [{ data: hostedHunts, error: hostedError }, { data: joinedParticipants, error: joinedError }] = await Promise.all([
    supabase
      .from("group_hunts")
      .select("id, host_user_id, title, location, start_date, end_date, invite_token, share_id, is_public, group_size, status, created_at")
      .eq("host_user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("group_hunt_participants")
      .select("id, group_hunt_id, user_id, seat_index, assigned_color_name, assigned_color_hex, assigned_prompt, invite_token, status, joined_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  if (hostedError) {
    throw hostedError;
  }

  if (joinedError) {
    throw joinedError;
  }

  const participantRows = (joinedParticipants ?? []) as GroupHuntParticipant[];
  const joinedGroupIds = [...new Set(participantRows.map((participant) => participant.group_hunt_id))];
  let joinedHunts: GroupHunt[] = [];

  if (joinedGroupIds.length > 0) {
    const { data, error } = await supabase
      .from("group_hunts")
      .select("id, host_user_id, title, location, start_date, end_date, invite_token, share_id, is_public, group_size, status, created_at")
      .in("id", joinedGroupIds)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    joinedHunts = (data ?? []) as GroupHunt[];
  }

  const participantIds = participantRows.map((participant) => participant.id);
  let joinedTripsByParticipantId = new Map<string, string>();

  if (participantIds.length > 0) {
    const { data, error } = await supabase
      .from("trips")
      .select("id, group_participant_id")
      .in("group_participant_id", participantIds)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    joinedTripsByParticipantId = new Map(
      (data ?? [])
        .filter((trip) => Boolean(trip.group_participant_id))
        .map((trip) => [String(trip.group_participant_id), trip.id]),
    );
  }

  return {
    hosted: (hostedHunts ?? []) as GroupHunt[],
    joined: joinedHunts
      .filter((hunt) => hunt.host_user_id !== userId)
      .map((hunt) => ({
        hunt,
        participant: participantRows.find((participant) => participant.group_hunt_id === hunt.id) ?? null,
        tripId: joinedTripsByParticipantId.get(
          participantRows.find((participant) => participant.group_hunt_id === hunt.id)?.id ?? "",
        ) ?? null,
      })),
  };
}

export async function getGroupHuntById(groupHuntId: string, userId: string): Promise<GroupHuntBundle | null> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: hunt, error: huntError } = await supabase
    .from("group_hunts")
    .select("id, host_user_id, title, location, start_date, end_date, invite_token, share_id, is_public, group_size, status, created_at")
    .eq("id", groupHuntId)
    .eq("host_user_id", userId)
    .maybeSingle();

  if (huntError) {
    throw huntError;
  }

  if (!hunt) {
    return null;
  }

  const { data: participants, error: participantError } = await admin
    .from("group_hunt_participants")
    .select("id, group_hunt_id, user_id, seat_index, assigned_color_name, assigned_color_hex, assigned_prompt, invite_token, status, joined_at, created_at")
    .eq("group_hunt_id", groupHuntId)
    .order("seat_index", { ascending: true });

  if (participantError) {
    throw participantError;
  }

  const participantRows = (participants ?? []) as GroupHuntParticipant[];
  const participantIds = participantRows.map((participant) => participant.id);
  let seats: GroupHuntParticipantSeat[] = participantRows;

  if (participantIds.length > 0) {
    const { data: trips, error: tripError } = await admin
      .from("trips")
      .select("id, group_participant_id")
      .in("group_participant_id", participantIds);

    if (tripError) {
      throw tripError;
    }

    const tripRows = (trips ?? []).filter((trip) => Boolean(trip.group_participant_id));
    const tripIds = tripRows.map((trip) => trip.id);
    const photoCountsByTripId = new Map<string, number>();

    if (tripIds.length > 0) {
      const { data: photos, error: photoError } = await admin.from("photos").select("trip_id").in("trip_id", tripIds);

      if (photoError) {
        throw photoError;
      }

      for (const photo of photos ?? []) {
        photoCountsByTripId.set(photo.trip_id, (photoCountsByTripId.get(photo.trip_id) ?? 0) + 1);
      }
    }

    const tripsByParticipantId = new Map(
      tripRows.map((trip) => [String(trip.group_participant_id), trip.id]),
    );

    seats = participantRows.map((participant) => {
      const tripId = tripsByParticipantId.get(participant.id) ?? null;
      return {
        ...participant,
        trip_id: tripId,
        photo_count: tripId ? photoCountsByTripId.get(tripId) ?? 0 : 0,
        max_photos: 9,
      };
    });
  }

  let results: GroupHuntParticipantResult[] = seats;

  if (participantIds.length > 0) {
    let allTripsResult = await admin
      .from("trips")
      .select("id, user_id, title, location, creation_mode, cover_template, start_date, end_date, group_hunt_id, group_participant_id, share_id, is_public, created_at")
      .eq("group_hunt_id", groupHuntId);

    if (isMissingCoverColumns(allTripsResult.error)) {
      allTripsResult = (await admin
        .from("trips")
        .select("id, user_id, title, location, start_date, end_date, group_hunt_id, group_participant_id, share_id, is_public, created_at")
        .eq("group_hunt_id", groupHuntId)) as typeof allTripsResult;
    }

    if (allTripsResult.error) {
      throw allTripsResult.error;
    }

    const tripRows = (allTripsResult.data ?? []).map((trip) => normalizeTrip(trip as Trip));
    const tripIds = tripRows.map((trip) => trip.id);
    const tripsByParticipantId = new Map(
      tripRows
        .filter((trip) => Boolean(trip.group_participant_id))
        .map((trip) => [String(trip.group_participant_id), trip]),
    );

    let missionsByTripId = new Map<string, Mission>();
    let photosByTripId = new Map<string, Photo[]>();

    if (tripIds.length > 0) {
      const [{ data: allMissions, error: allMissionsError }, photosResult] = await Promise.all([
        admin
          .from("missions")
          .select("id, trip_id, color_name, color_hex, prompt, max_photos, created_at")
          .in("trip_id", tripIds)
          .order("created_at", { ascending: false }),
        admin
          .from("photos")
          .select("id, trip_id, mission_id, user_id, image_url, storage_path, sort_order, caption, dominant_color, color_match_score, created_at")
          .in("trip_id", tripIds)
          .order("sort_order", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true }),
      ]);

      if (allMissionsError) {
        throw allMissionsError;
      }

      let allPhotos = photosResult.data as Photo[] | null;
      let allPhotosError = photosResult.error as SupabaseErrorLike | null;

      if (isMissingSortOrderColumn(allPhotosError)) {
        const fallbackResult = await admin
          .from("photos")
          .select("id, trip_id, mission_id, user_id, image_url, storage_path, caption, dominant_color, color_match_score, created_at")
          .in("trip_id", tripIds)
          .order("created_at", { ascending: true });

        allPhotos = (fallbackResult.data ?? []).map((photo) => ({
          ...photo,
          sort_order: null,
        })) as Photo[];
        allPhotosError = fallbackResult.error;
      }

      if (allPhotosError) {
        throw allPhotosError;
      }

      for (const mission of (allMissions ?? []) as Mission[]) {
        if (!missionsByTripId.has(mission.trip_id)) {
          missionsByTripId.set(mission.trip_id, mission);
        }
      }

      for (const photo of allPhotos ?? []) {
        const photos = photosByTripId.get(photo.trip_id) ?? [];
        photos.push(photo);
        photosByTripId.set(photo.trip_id, photos);
      }

      photosByTripId = new Map(
        [...photosByTripId.entries()].map(([tripId, photos]) => [tripId, sortPhotosByDisplayOrder(photos)]),
      );
    }

    results = seats.map((seat) => {
      const trip = seat.trip_id ? tripsByParticipantId.get(seat.id) ?? null : null;
      const mission = trip ? missionsByTripId.get(trip.id) ?? null : null;
      const photos = trip ? photosByTripId.get(trip.id) ?? [] : [];
      return {
        ...seat,
        trip,
        mission,
        photos,
      };
    });
  }

  return {
    hunt: hunt as GroupHunt,
    participants: seats,
    results,
  };
}

export async function getGroupParticipantForUser(groupHuntId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_hunt_participants")
    .select("id, group_hunt_id, user_id, seat_index, assigned_color_name, assigned_color_hex, assigned_prompt, invite_token, status, joined_at, created_at")
    .eq("group_hunt_id", groupHuntId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as GroupHuntParticipant | null) ?? null;
}

export async function getTripForParticipant(groupParticipantId: string, userId: string) {
  const supabase = await createClient();
  let result = await supabase
    .from("trips")
    .select("id, user_id, title, location, creation_mode, cover_template, start_date, end_date, group_hunt_id, group_participant_id, created_at")
    .eq("group_participant_id", groupParticipantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (isMissingCoverColumns(result.error)) {
    result = (await supabase
      .from("trips")
      .select("id, user_id, title, location, start_date, end_date, group_hunt_id, group_participant_id, created_at")
      .eq("group_participant_id", groupParticipantId)
      .eq("user_id", userId)
      .maybeSingle()) as typeof result;
  }

  if (result.error) {
    throw result.error;
  }

  return result.data ? normalizeTrip(result.data as Trip) : null;
}

export async function getGroupParticipantByInviteToken(inviteToken: string): Promise<GroupHuntInviteSeat | null> {
  const admin = createAdminClient();
  const { data: participant, error: participantError } = await admin
    .from("group_hunt_participants")
    .select("id, group_hunt_id, user_id, seat_index, assigned_color_name, assigned_color_hex, assigned_prompt, invite_token, status, joined_at, created_at")
    .eq("invite_token", inviteToken)
    .maybeSingle();

  if (participantError) {
    throw participantError;
  }

  if (!participant) {
    return null;
  }

  const { data: hunt, error: huntError } = await admin
    .from("group_hunts")
    .select("id, host_user_id, title, location, start_date, end_date, invite_token, share_id, is_public, group_size, status, created_at")
    .eq("id", participant.group_hunt_id)
    .maybeSingle();

  if (huntError) {
    throw huntError;
  }

  if (!hunt) {
    return null;
  }

  return {
    hunt: hunt as GroupHunt,
    participant: participant as GroupHuntParticipant,
  };
}

export async function getPublicGroupHuntByShareId(shareId: string): Promise<GroupHuntBundle | null> {
  const admin = createAdminClient();
  const { data: hunt, error: huntError } = await admin
    .from("group_hunts")
    .select("id, host_user_id, title, location, start_date, end_date, invite_token, share_id, is_public, group_size, status, created_at")
    .eq("share_id", shareId)
    .eq("is_public", true)
    .maybeSingle();

  if (huntError) {
    throw huntError;
  }

  if (!hunt) {
    return null;
  }

  const { data: participants, error: participantError } = await admin
    .from("group_hunt_participants")
    .select("id, group_hunt_id, user_id, seat_index, assigned_color_name, assigned_color_hex, assigned_prompt, invite_token, status, joined_at, created_at")
    .eq("group_hunt_id", hunt.id)
    .order("seat_index", { ascending: true });

  if (participantError) {
    throw participantError;
  }

  const participantRows = (participants ?? []) as GroupHuntParticipant[];
  const participantIds = participantRows.map((participant) => participant.id);
  let seats: GroupHuntParticipantSeat[] = participantRows;

  if (participantIds.length > 0) {
    let tripsResult = await admin
      .from("trips")
      .select("id, user_id, title, location, creation_mode, cover_template, start_date, end_date, group_hunt_id, group_participant_id, share_id, is_public, created_at")
      .in("group_participant_id", participantIds);

    if (isMissingCoverColumns(tripsResult.error)) {
      tripsResult = (await admin
        .from("trips")
        .select("id, user_id, title, location, start_date, end_date, group_hunt_id, group_participant_id, share_id, is_public, created_at")
        .in("group_participant_id", participantIds)) as typeof tripsResult;
    }

    if (tripsResult.error) {
      throw tripsResult.error;
    }

    const tripRows = (tripsResult.data ?? []).map((trip) => normalizeTrip(trip as Trip));
    const tripIds = tripRows.map((trip) => trip.id);
    const tripsByParticipantId = new Map(
      tripRows
        .filter((trip) => Boolean(trip.group_participant_id))
        .map((trip) => [String(trip.group_participant_id), trip]),
    );
    let missionsByTripId = new Map<string, Mission>();
    let photosByTripId = new Map<string, Photo[]>();

    if (tripIds.length > 0) {
      const [{ data: allMissions, error: allMissionsError }, photosResult] = await Promise.all([
        admin
          .from("missions")
          .select("id, trip_id, color_name, color_hex, prompt, max_photos, created_at")
          .in("trip_id", tripIds)
          .order("created_at", { ascending: false }),
        admin
          .from("photos")
          .select("id, trip_id, mission_id, user_id, image_url, storage_path, sort_order, caption, dominant_color, color_match_score, created_at")
          .in("trip_id", tripIds)
          .order("sort_order", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true }),
      ]);

      if (allMissionsError) {
        throw allMissionsError;
      }

      let allPhotos = photosResult.data as Photo[] | null;
      let allPhotosError = photosResult.error as SupabaseErrorLike | null;

      if (isMissingSortOrderColumn(allPhotosError)) {
        const fallbackResult = await admin
          .from("photos")
          .select("id, trip_id, mission_id, user_id, image_url, storage_path, caption, dominant_color, color_match_score, created_at")
          .in("trip_id", tripIds)
          .order("created_at", { ascending: true });

        allPhotos = (fallbackResult.data ?? []).map((photo) => ({
          ...photo,
          sort_order: null,
        })) as Photo[];
        allPhotosError = fallbackResult.error;
      }

      if (allPhotosError) {
        throw allPhotosError;
      }

      for (const mission of (allMissions ?? []) as Mission[]) {
        if (!missionsByTripId.has(mission.trip_id)) {
          missionsByTripId.set(mission.trip_id, mission);
        }
      }

      for (const photo of allPhotos ?? []) {
        const photos = photosByTripId.get(photo.trip_id) ?? [];
        photos.push(photo);
        photosByTripId.set(photo.trip_id, photos);
      }

      photosByTripId = new Map(
        [...photosByTripId.entries()].map(([tripId, photos]) => [tripId, sortPhotosByDisplayOrder(photos)]),
      );
    }

    seats = participantRows.map((participant) => {
      const trip = tripsByParticipantId.get(participant.id) ?? null;
      const photos = trip ? photosByTripId.get(trip.id) ?? [] : [];
      const mission = trip ? missionsByTripId.get(trip.id) ?? null : null;
      return {
        ...participant,
        trip_id: trip?.id ?? null,
        photo_count: photos.length,
        max_photos: mission?.max_photos ?? 9,
      };
    });

    const results = participantRows.map((participant) => {
      const trip = tripsByParticipantId.get(participant.id) ?? null;
      const mission = trip ? missionsByTripId.get(trip.id) ?? null : null;
      const photos = trip ? photosByTripId.get(trip.id) ?? [] : [];
      return {
        ...participant,
        trip_id: trip?.id ?? null,
        photo_count: photos.length,
        max_photos: mission?.max_photos ?? 9,
        trip,
        mission,
        photos,
      };
    });

    return {
      hunt: hunt as GroupHunt,
      participants: seats,
      results,
    };
  }

  return {
    hunt: hunt as GroupHunt,
    participants: seats,
    results: seats,
  };
}
