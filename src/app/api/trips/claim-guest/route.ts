import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin-supabase";
import { createClient } from "@/lib/supabase/server";
import { isAnonymousUser } from "@/lib/user-state";

export const runtime = "nodejs";

async function transferGuestTripToUser({
  tripId,
  fromUserId,
  toUserId,
}: {
  tripId: string;
  fromUserId: string;
  toUserId: string;
}) {
  const admin = createAdminClient();

  const { data: trip, error: tripError } = await admin
    .from("trips")
    .select("id, user_id")
    .eq("id", tripId)
    .maybeSingle();

  if (tripError) {
    throw tripError;
  }

  if (!trip) {
    return { transferred: false, reason: "missing" as const };
  }

  if (trip.user_id === toUserId) {
    return { transferred: false, reason: "already_owned" as const };
  }

  if (trip.user_id !== fromUserId) {
    return { transferred: false, reason: "owner_mismatch" as const };
  }

  const { error: photoTransferError } = await admin
    .from("photos")
    .update({ user_id: toUserId })
    .eq("trip_id", tripId)
    .eq("user_id", fromUserId);

  if (photoTransferError) {
    throw photoTransferError;
  }

  const { error: tripTransferError } = await admin
    .from("trips")
    .update({ user_id: toUserId })
    .eq("id", tripId)
    .eq("user_id", fromUserId);

  if (tripTransferError) {
    throw tripTransferError;
  }

  return { transferred: true as const };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || isAnonymousUser(user)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json()) as { tripId?: string; guestUserId?: string };
    const tripId = payload.tripId?.trim();
    const guestUserId = payload.guestUserId?.trim();

    if (!tripId || !guestUserId) {
      return NextResponse.json({ ok: false, error: "Missing transfer data." }, { status: 400 });
    }

    const result = await transferGuestTripToUser({
      tripId,
      fromUserId: guestUserId,
      toUserId: user.id,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Guest trip claim failed.",
      },
      { status: 500 },
    );
  }
}
