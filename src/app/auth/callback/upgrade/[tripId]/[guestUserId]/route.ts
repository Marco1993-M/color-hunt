import { type NextRequest } from "next/server";
import { handleAuthCallback } from "@/lib/auth-callback";

type UpgradeCallbackRouteProps = {
  params: Promise<{
    tripId: string;
    guestUserId: string;
  }>;
};

export async function GET(request: NextRequest, { params }: UpgradeCallbackRouteProps) {
  const { tripId, guestUserId } = await params;

  return await handleAuthCallback(request, {
    next: `/trips/${tripId}/poster`,
    transferTripId: tripId,
    guestUserId,
  });
}
