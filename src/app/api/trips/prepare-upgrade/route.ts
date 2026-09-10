import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin-supabase";
import { isAnonymousUser } from "@/lib/user-state";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAnonymousUser(user)) return NextResponse.json({ error: "Sign in as the guest who created this poster." }, { status: 401 });
  const payload = await request.json().catch(() => null);
  if (typeof payload?.tripId !== "string") return NextResponse.json({ error: "Choose a poster to keep." }, { status: 400 });
  const { data: trip, error } = await supabase.from("trips").select("id").eq("id", payload.tripId).eq("user_id", user.id).maybeSingle();
  if (error || !trip) return NextResponse.json({ error: "This poster is not available in your guest session." }, { status: 403 });
  const token = randomBytes(32).toString("hex");
  const { error: saveError } = await createAdminClient().from("guest_trip_transfers").insert({
    token_hash: createHash("sha256").update(token).digest("hex"), trip_id: trip.id, guest_user_id: user.id,
    expires_at: new Date(Date.now() + 20 * 60_000).toISOString(),
  });
  if (saveError) return NextResponse.json({ error: "We couldn't prepare sign-in. Your poster is still saved here; please try again." }, { status: 503 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set("colorhunt-transfer", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 1200 });
  return response;
}
