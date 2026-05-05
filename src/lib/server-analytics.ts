import { createClient } from "@/lib/supabase/server";

type ServerAnalyticsPayload = {
  eventName: string;
  tripId?: string | null;
  shareId?: string | null;
  userId?: string | null;
  path?: string | null;
  metadata?: Record<string, unknown>;
};

export async function trackServerEvent({
  eventName,
  tripId = null,
  shareId = null,
  userId = null,
  path = null,
  metadata = {},
}: ServerAnalyticsPayload) {
  try {
    const supabase = await createClient();

    await supabase.from("analytics_events").insert({
      event_name: eventName,
      trip_id: tripId,
      share_id: shareId,
      path,
      session_id: null,
      user_id: userId,
      metadata,
    });
  } catch {
    // Server-side analytics should never interrupt the product flow.
  }
}
