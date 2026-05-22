import { createAdminClient } from "@/lib/admin-supabase";

type ServerAnalyticsPayload = {
  eventName: string;
  tripId?: string | null;
  shareId?: string | null;
  userId?: string | null;
  path?: string | null;
  sessionId?: string | null;
  journeyId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function trackServerEvent({
  eventName,
  tripId = null,
  shareId = null,
  userId = null,
  path = null,
  sessionId = null,
  journeyId = null,
  metadata = {},
}: ServerAnalyticsPayload) {
  try {
    const supabase = createAdminClient();

    await supabase.from("analytics_events").insert({
      event_name: eventName,
      trip_id: tripId,
      share_id: shareId,
      path,
      session_id: sessionId,
      journey_id: journeyId,
      user_id: userId,
      metadata,
    });
  } catch (error) {
    console.error("server analytics insert failed", {
      eventName,
      tripId,
      shareId,
      userId,
      path,
      sessionId,
      journeyId,
      error,
    });
    // Server-side analytics should never interrupt the product flow.
  }
}
