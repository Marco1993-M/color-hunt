import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/admin-supabase";
import { getSupabaseEnv } from "@/lib/env";
import { getPosterExportBucketName } from "@/lib/poster-cache";
import { getRetentionDays, retentionPolicy } from "@/lib/retention";

export const runtime = "nodejs";

type CleanupTripRecord = {
  id: string;
  created_at: string;
  is_public: boolean;
  photos: Array<{ id: string; storage_path: string; created_at: string }> | null;
  poster_exports: Array<{ storage_path: string }> | null;
  missions: Array<{ max_photos: number }> | null;
};

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (secret) {
    return authHeader === `Bearer ${secret}`;
  }

  return process.env.NODE_ENV !== "production";
}

function getLastActivityAt(trip: CleanupTripRecord) {
  const photoTimestamps = (trip.photos ?? []).map((photo) => new Date(photo.created_at).getTime());
  const tripCreatedAt = new Date(trip.created_at).getTime();
  const latestTimestamp = Math.max(tripCreatedAt, ...photoTimestamps);
  return new Date(latestTimestamp);
}

function shouldDeleteTrip(trip: CleanupTripRecord, now: Date) {
  const photoCount = trip.photos?.length ?? 0;
  const maxPhotos = trip.missions?.[0]?.max_photos ?? retentionPolicy.defaultMaxPhotos;
  const retentionDays = getRetentionDays({
    isPublic: trip.is_public,
    photoCount,
    maxPhotos,
  });
  const lastActivityAt = getLastActivityAt(trip);
  const expiresAt = new Date(lastActivityAt);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + retentionDays);

  return {
    photoCount,
    maxPhotos,
    retentionDays,
    lastActivityAt,
    expiresAt,
    isExpired: expiresAt <= now,
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const bucketName = getSupabaseEnv().storageBucket;
    const posterExportBucketName = getPosterExportBucketName();
    const now = new Date();

    const { data, error } = await supabase
      .from("trips")
      .select("id, created_at, is_public, photos(id, storage_path, created_at), poster_exports(storage_path), missions(max_photos)")
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    const trips = (data ?? []) as CleanupTripRecord[];
    const expiredTrips = trips
      .map((trip) => ({
        trip,
        ...shouldDeleteTrip(trip, now),
      }))
      .filter((entry) => entry.isExpired);

    let deletedTrips = 0;
    let deletedPhotos = 0;
    const failures: Array<{ tripId: string; message: string }> = [];

    for (const entry of expiredTrips) {
      const storagePaths = (entry.trip.photos ?? []).map((photo) => photo.storage_path);
      const posterExportPaths = (entry.trip.poster_exports ?? []).map((posterExport) => posterExport.storage_path);

      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage.from(bucketName).remove(storagePaths);

        if (storageError) {
          failures.push({
            tripId: entry.trip.id,
            message: storageError.message,
          });
          continue;
        }
      }

      if (posterExportPaths.length > 0) {
        const { error: exportStorageError } = await supabase.storage.from(posterExportBucketName).remove(posterExportPaths);

        if (exportStorageError) {
          failures.push({
            tripId: entry.trip.id,
            message: exportStorageError.message,
          });
          continue;
        }
      }

      const { error: tripDeleteError } = await supabase.from("trips").delete().eq("id", entry.trip.id);

      if (tripDeleteError) {
        failures.push({
          tripId: entry.trip.id,
          message: tripDeleteError.message,
        });
        continue;
      }

      deletedTrips += 1;
      deletedPhotos += storagePaths.length;
    }

    return NextResponse.json({
      ok: true,
      policy: {
        incompleteDays: retentionPolicy.incompleteDays,
        completePrivateDays: retentionPolicy.completePrivateDays,
        publicDays: retentionPolicy.publicDays,
      },
      scannedTrips: trips.length,
      expiredTrips: expiredTrips.length,
      deletedTrips,
      deletedPhotos,
      failures,
      runAt: now.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Cleanup failed",
      },
      { status: 500 },
    );
  }
}
