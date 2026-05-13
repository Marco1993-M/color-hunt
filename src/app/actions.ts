"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/admin-supabase";
import { ensureProfile, getGroupParticipantByInviteToken } from "@/lib/data";
import { getSupabaseEnv } from "@/lib/env";
import { getMissionByColorName, getRandomMission } from "@/lib/missions";
import { getPosterExportBucketName } from "@/lib/poster-cache";
import { trackServerEvent } from "@/lib/server-analytics";
import { createClient } from "@/lib/supabase/server";

type GroupAssignmentInput = {
  slot: number;
  colorName: string;
  colorHex: string;
  prompt: string;
};

function parseGroupAssignments(rawValue: FormDataEntryValue | null) {
  const raw = String(rawValue || "").trim();

  if (!raw) {
    return [] as GroupAssignmentInput[];
  }

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    return [] as GroupAssignmentInput[];
  }

  return parsed
    .map((assignment) => {
      if (!assignment || typeof assignment !== "object") {
        return null;
      }

      const record = assignment as Record<string, unknown>;
      const slot = Number(record.slot);
      const colorName = String(record.colorName || "").trim();
      const colorHex = String(record.colorHex || "").trim();
      const prompt = String(record.prompt || "").trim();

      if (!Number.isInteger(slot) || !colorName || !colorHex || !prompt) {
        return null;
      }

      return {
        slot,
        colorName,
        colorHex,
        prompt,
      } satisfies GroupAssignmentInput;
    })
    .filter((assignment): assignment is GroupAssignmentInput => Boolean(assignment));
}

async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  await ensureProfile(user);
  return user;
}

async function createTripForParticipant({
  admin,
  userId,
  title,
  location,
  startDate,
  endDate,
  groupHuntId,
  groupParticipantId,
  mission,
}: {
  admin: ReturnType<typeof createAdminClient>;
  userId: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  groupHuntId: string;
  groupParticipantId: string;
  mission: { color_name: string; color_hex: string; prompt: string };
}) {
  const { data: trip, error: tripError } = await admin
    .from("trips")
    .insert({
      user_id: userId,
      title,
      location,
      start_date: startDate || null,
      end_date: endDate || null,
      group_hunt_id: groupHuntId,
      group_participant_id: groupParticipantId,
    })
    .select("id")
    .single();

  if (tripError || !trip) {
    throw tripError ?? new Error("Unable to create the participant trip.");
  }

  const { error: missionError } = await admin.from("missions").insert({
    trip_id: trip.id,
    color_name: mission.color_name,
    color_hex: mission.color_hex,
    prompt: mission.prompt,
    max_photos: 9,
  });

  if (missionError) {
    throw missionError;
  }

  return trip.id;
}

async function removeTripAssetsByTripIds({
  admin,
  tripIds,
}: {
  admin: ReturnType<typeof createAdminClient>;
  tripIds: string[];
}) {
  if (tripIds.length === 0) {
    return;
  }

  const [photosResult, exportsResult] = await Promise.all([
    admin.from("photos").select("storage_path").in("trip_id", tripIds),
    admin.from("poster_exports").select("storage_path").in("trip_id", tripIds),
  ]);

  if (photosResult.error) {
    throw photosResult.error;
  }

  if (exportsResult.error) {
    throw exportsResult.error;
  }

  const photoPaths = (photosResult.data ?? []).map((photo) => photo.storage_path).filter(Boolean);
  const exportPaths = (exportsResult.data ?? []).map((posterExport) => posterExport.storage_path).filter(Boolean);
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
}

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
  const user = await requireAuthenticatedUser();
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

export async function createGroupHuntAction(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const startDate = String(formData.get("start_date") || "").trim();
  const endDate = String(formData.get("end_date") || "").trim();
  const selectedColor = String(formData.get("color_name") || "").trim();
  const groupSize = Number(formData.get("group_size") || 0);
  const assignments = parseGroupAssignments(formData.get("group_assignments_json"));

  if (!title || !location) {
    throw new Error("Trip title and location are required.");
  }

  if (!Number.isInteger(groupSize) || groupSize < 2 || groupSize > 9) {
    throw new Error("Group hunts need between 2 and 9 people.");
  }

  if (assignments.length !== groupSize) {
    throw new Error("The group color assignments are out of sync. Refresh and try again.");
  }

  const user = await requireAuthenticatedUser();
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const hostAssignment = assignments.find((assignment) => assignment.colorName === selectedColor) ?? assignments[0];

  if (!hostAssignment) {
    throw new Error("The host color assignment could not be determined.");
  }

  const { data: hunt, error: huntError } = await admin
    .from("group_hunts")
    .insert({
      host_user_id: user.id,
      title,
      location,
      start_date: startDate || null,
      end_date: endDate || null,
      group_size: groupSize,
      status: "active",
    })
    .select("id, invite_token")
    .single();

  if (huntError || !hunt) {
    throw huntError ?? new Error("Unable to create the group hunt.");
  }

  const participantRows = assignments.map((assignment) => ({
    group_hunt_id: hunt.id,
    user_id: assignment.colorName === hostAssignment.colorName ? user.id : null,
    seat_index: assignment.slot,
    assigned_color_name: assignment.colorName,
    assigned_color_hex: assignment.colorHex,
    assigned_prompt: assignment.prompt,
    status: assignment.colorName === hostAssignment.colorName ? "joined" : "invited",
    joined_at: assignment.colorName === hostAssignment.colorName ? now : null,
  }));

  const { data: participants, error: participantError } = await admin
    .from("group_hunt_participants")
    .insert(participantRows)
    .select("id, assigned_color_name");

  if (participantError || !participants) {
    throw participantError ?? new Error("Unable to assign the group colors.");
  }

  const hostParticipant = participants.find((participant) => participant.assigned_color_name === hostAssignment.colorName);

  if (!hostParticipant) {
    throw new Error("The host seat could not be created.");
  }

  const tripId = await createTripForParticipant({
    admin,
    userId: user.id,
    title,
    location,
    startDate,
    endDate,
    groupHuntId: hunt.id,
    groupParticipantId: hostParticipant.id,
    mission: {
      color_name: hostAssignment.colorName,
      color_hex: hostAssignment.colorHex,
      prompt: hostAssignment.prompt,
    },
  });

  await trackServerEvent({
    eventName: "group_hunt_created",
    tripId,
    userId: user.id,
    path: `/group-hunts/${hunt.id}`,
    metadata: {
      groupHuntId: hunt.id,
      groupSize,
      hostColorName: hostAssignment.colorName,
      location,
      title,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/trips/new");
  redirect(`/group-hunts/${hunt.id}`);
}

export async function joinGroupHuntAction(formData: FormData) {
  const inviteToken = String(formData.get("invite_token") || "").trim();

  if (!inviteToken) {
    throw new Error("This invite link is missing its seat token.");
  }

  const user = await requireAuthenticatedUser();
  const admin = createAdminClient();
  const inviteSeat = await getGroupParticipantByInviteToken(inviteToken);

  if (!inviteSeat) {
    throw new Error("This invite link is no longer valid.");
  }

  const { hunt, participant } = inviteSeat;

  if (participant.user_id && participant.user_id !== user.id) {
    throw new Error("This invite link has already been claimed.");
  }

  const { data: existingTrip, error: existingTripError } = await admin
    .from("trips")
    .select("id")
    .eq("group_participant_id", participant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingTripError) {
    throw existingTripError;
  }

  if (!participant.user_id) {
    const { error: updateError } = await admin
      .from("group_hunt_participants")
      .update({
        user_id: user.id,
        status: "joined",
        joined_at: new Date().toISOString(),
      })
      .eq("id", participant.id)
      .is("user_id", null);

    if (updateError) {
      throw updateError;
    }
  }

  const tripId =
    existingTrip?.id ??
    (await createTripForParticipant({
      admin,
      userId: user.id,
      title: hunt.title,
      location: hunt.location,
      startDate: hunt.start_date ?? "",
      endDate: hunt.end_date ?? "",
      groupHuntId: hunt.id,
      groupParticipantId: participant.id,
      mission: {
        color_name: participant.assigned_color_name,
        color_hex: participant.assigned_color_hex,
        prompt: participant.assigned_prompt,
      },
    }));

  await admin.from("group_hunts").update({ status: "active" }).eq("id", hunt.id);

  await trackServerEvent({
    eventName: "group_hunt_joined",
    tripId,
    userId: user.id,
    path: `/join/${inviteToken}`,
    metadata: {
      groupHuntId: hunt.id,
      participantId: participant.id,
      assignedColorName: participant.assigned_color_name,
      seatIndex: participant.seat_index + 1,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/group-hunts/${hunt.id}`);
  revalidatePath(`/join/${inviteToken}`);
  redirect(`/trips/${tripId}`);
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

  const admin = createAdminClient();
  await removeTripAssetsByTripIds({ admin, tripIds: [tripId] });

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

export async function deleteGroupHuntAction(formData: FormData) {
  const groupHuntId = String(formData.get("group_hunt_id") || "").trim();

  if (!groupHuntId) {
    throw new Error("Group hunt ID is required.");
  }

  const user = await requireAuthenticatedUser();
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: hunt, error: huntError } = await supabase
    .from("group_hunts")
    .select("id, title, location")
    .eq("id", groupHuntId)
    .eq("host_user_id", user.id)
    .maybeSingle();

  if (huntError) {
    throw huntError;
  }

  if (!hunt) {
    throw new Error("This group hunt could not be found.");
  }

  const { data: trips, error: tripsError } = await admin
    .from("trips")
    .select("id, share_id")
    .eq("group_hunt_id", groupHuntId);

  if (tripsError) {
    throw tripsError;
  }

  const tripIds = (trips ?? []).map((trip) => trip.id);
  const shareIds = (trips ?? []).map((trip) => trip.share_id).filter(Boolean);

  await removeTripAssetsByTripIds({ admin, tripIds });

  if (tripIds.length > 0) {
    const { error: deleteTripsError } = await admin.from("trips").delete().in("id", tripIds);

    if (deleteTripsError) {
      throw deleteTripsError;
    }
  }

  const { error: deleteHuntError } = await admin
    .from("group_hunts")
    .delete()
    .eq("id", groupHuntId)
    .eq("host_user_id", user.id);

  if (deleteHuntError) {
    throw deleteHuntError;
  }

  await trackServerEvent({
    eventName: "group_hunt_deleted",
    userId: user.id,
    path: "/dashboard",
    metadata: {
      groupHuntId,
      location: hunt.location,
      shareIds,
      title: hunt.title,
      tripCount: tripIds.length,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/group-hunts/${groupHuntId}`);
  for (const tripId of tripIds) {
    revalidatePath(`/trips/${tripId}`);
    revalidatePath(`/trips/${tripId}/poster`);
  }
  for (const shareId of shareIds) {
    revalidatePath(`/poster/${shareId}`);
  }

  redirect("/dashboard");
}
