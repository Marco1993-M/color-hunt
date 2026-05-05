"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/data";
import { getMissionByColorName, getRandomMission } from "@/lib/missions";
import { trackServerEvent } from "@/lib/server-analytics";
import { createClient } from "@/lib/supabase/server";

export async function createTripAction(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const startDate = String(formData.get("start_date") || "").trim();
  const endDate = String(formData.get("end_date") || "").trim();
  const selectedColor = String(formData.get("color_name") || "random").trim();

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
