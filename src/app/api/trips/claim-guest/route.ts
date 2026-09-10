import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin-supabase";
import { createClient } from "@/lib/supabase/server";
import { isAnonymousUser } from "@/lib/user-state";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || isAnonymousUser(user)) return NextResponse.json({ error: "Please finish signing in first." }, { status: 401 });
  const payload = await request.json().catch(() => null);
  if (typeof payload?.tripId !== "string") return NextResponse.json({ error: "Missing poster." }, { status: 400 });
  // Idempotent retries are safe only when the authenticated user already owns it.
  const { data: owned } = await supabase.from("trips").select("id").eq("id", payload.tripId).eq("user_id", user.id).maybeSingle();
  if (owned) return NextResponse.json({ ok: true, transferred: false });
  const token = (await cookies()).get("colorhunt-transfer")?.value;
  if (!token) return NextResponse.json({ error: "The guest handoff has expired. Return to the browser where you created the poster and connect your account again." }, { status: 403 });
  const { error } = await createAdminClient().rpc("claim_guest_trip", {
    p_trip_id: payload.tripId, p_user_id: user.id,
    p_token_hash: createHash("sha256").update(token).digest("hex"),
  });
  if (error) return NextResponse.json({ error: "We couldn't attach this poster. Return to your guest session and try connecting again." }, { status: 403 });
  const response = NextResponse.json({ ok: true, transferred: true });
  response.cookies.delete("colorhunt-transfer");
  return response;
}
