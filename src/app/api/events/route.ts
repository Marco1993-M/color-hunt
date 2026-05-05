import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type EventBody = {
  eventName?: string;
  tripId?: string | null;
  shareId?: string | null;
  path?: string | null;
  sessionId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EventBody;

    if (!body.eventName || typeof body.eventName !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("analytics_events").insert({
      event_name: body.eventName,
      trip_id: body.tripId ?? null,
      share_id: body.shareId ?? null,
      path: body.path ?? null,
      session_id: body.sessionId ?? null,
      user_id: user?.id ?? null,
      metadata: body.metadata ?? {},
    });

    if (error) {
      return NextResponse.json({ ok: true, skipped: true }, { status: 202 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true, skipped: true }, { status: 202 });
  }
}
