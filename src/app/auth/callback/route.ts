import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin-supabase";
import { getSupabaseEnv } from "@/lib/env";
import { isAnonymousUser } from "@/lib/user-state";

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
    .eq("user_id", fromUserId)
    .maybeSingle();

  if (tripError) {
    throw tripError;
  }

  if (!trip) {
    return;
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
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/dashboard";
  const transferTripId = requestUrl.searchParams.get("transferTripId");
  const handoffUrl = new URL("/auth/finish", request.url);
  handoffUrl.searchParams.set("next", next);
  const response = NextResponse.redirect(handoffUrl);

  if (code) {
    const env = getSupabaseEnv();
    const supabase = createServerClient(env.url, env.publishableKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user: previousUser },
    } = await supabase.auth.getUser();

    await supabase.auth.exchangeCodeForSession(code);

    const {
      data: { user: nextUser },
    } = await supabase.auth.getUser();

    if (
      transferTripId &&
      previousUser &&
      nextUser &&
      previousUser.id !== nextUser.id &&
      isAnonymousUser(previousUser) &&
      !isAnonymousUser(nextUser)
    ) {
      try {
        await transferGuestTripToUser({
          tripId: transferTripId,
          fromUserId: previousUser.id,
          toUserId: nextUser.id,
        });
      } catch (error) {
        console.error("guest trip transfer failed", error);
      }
    }
  }

  return response;
}
