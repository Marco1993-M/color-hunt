import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin-supabase";
import { getSupabaseEnv } from "@/lib/env";
import { getRetentionDays, retentionPolicy } from "@/lib/retention";
import { drainAssetCleanupQueue } from "@/lib/asset-cleanup";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret ? request.headers.get("authorization") !== `Bearer ${secret}` : process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const dryRun = request.nextUrl.searchParams.get("dryRun") === "true";
  try {
    const admin = createAdminClient();
    const now = Date.now();
    const startedAt = now;
    const state = dryRun ? null : await admin.from("cleanup_scan_state").select("after_id").eq("id", true).single();
    if (state?.error) throw state.error;
    let afterId: string | null = dryRun ? request.nextUrl.searchParams.get("after") : state?.data?.after_id ?? null;
    let scanned = 0, expired = 0, deleted = 0;
    let more = true;
    // Keyset pagination remains correct while rows are deleted. Leave time for queued storage cleanup.
    while (more && Date.now() - startedAt < 35_000) {
      let query = admin.from("trips").select("id, last_activity_at, is_public, photos(id), missions(max_photos)").order("id").limit(100);
      if (afterId) query = query.gt("id", afterId);
      const { data: trips, error } = await query;
      if (error) throw error;
      more = (trips?.length ?? 0) === 100;
      for (const trip of trips ?? []) {
        scanned += 1;
        afterId = trip.id;
        const count = trip.photos?.length ?? 0;
        const maxPhotos = trip.missions?.[0]?.max_photos ?? retentionPolicy.defaultMaxPhotos;
        const duration = count === 0 ? retentionPolicy.emptyDraftHours * 3_600_000
          : getRetentionDays({ isPublic: trip.is_public, photoCount: count, maxPhotos }) * 86_400_000;
        if (new Date(trip.last_activity_at).getTime() + duration > now) continue;
        expired += 1;
        if (dryRun) continue;
        const result = await admin.rpc("enqueue_trip_deletion", { p_trip_id: trip.id, p_expected_activity: trip.last_activity_at, p_photo_bucket: getSupabaseEnv().storageBucket });
        if (result.error) throw result.error;
        if (result.data) deleted += 1;
      }
    }
    if (!dryRun) {
      const savedCursor = await admin.from("cleanup_scan_state").update({ after_id: more ? afterId : null }).eq("id", true);
      if (savedCursor.error) throw savedCursor.error;
    }
    const cleanup = dryRun ? { processed: 0, failures: [] } : await drainAssetCleanupQueue(admin);
    if (!dryRun) await admin.from("guest_trip_transfers").delete().lt("expires_at", new Date(now).toISOString());
    return NextResponse.json({ ok: !cleanup.failures.length, dryRun, scanned, expired, deleted, more, nextCursor: more ? afterId : null, cleanup }, { status: cleanup.failures.length ? 503 : 200 });
  } catch (error) {
    console.error("Trip cleanup failed", error);
    return NextResponse.json({ ok: false, error: "Cleanup needs attention. Pending asset removals will be retried." }, { status: 503 });
  }
}
