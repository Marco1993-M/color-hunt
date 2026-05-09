import { createAdminClient } from "@/lib/admin-supabase";
import { posterExportFormats, type PosterExportFormatId } from "@/lib/poster-export";
import { createPosterImageResponse, getPosterExportFileName } from "@/lib/poster-render";
import type { Mission, Photo, PosterExport, Trip } from "@/lib/types";

const POSTER_EXPORT_BUCKET = "poster-exports";

export function getPosterExportBucketName() {
  return POSTER_EXPORT_BUCKET;
}

export function getPosterExportStoragePath(userId: string, tripId: string, formatId: PosterExportFormatId, version: number) {
  return `${userId}/${tripId}/${formatId}-${version}.png`;
}

export function getPosterExportPublicUrl(storagePath: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }

  return `${supabaseUrl}/storage/v1/object/public/${POSTER_EXPORT_BUCKET}/${storagePath}`;
}

export async function generatePosterExports({
  trip,
  mission,
  photos,
  formats,
  force = false,
}: {
  trip: Trip;
  mission: Mission;
  photos: Photo[];
  formats?: PosterExportFormatId[];
  force?: boolean;
}) {
  const supabase = createAdminClient();
  const {
    data: existingRows,
    error: existingError,
  } = await supabase
    .from("poster_exports")
    .select("id, trip_id, format, storage_path, image_url, generated_at")
    .eq("trip_id", trip.id);

  if (existingError) {
    throw existingError;
  }

  const existingByFormat = new Map(
    ((existingRows as PosterExport[] | null) ?? []).map((row) => [row.format, row]),
  );

  const generatedAt = new Date().toISOString();
  const nextRows: PosterExport[] = [];
  const oldPathsToDelete: string[] = [];
  const formatsToGenerate =
    formats && formats.length > 0
      ? posterExportFormats.filter((format) => formats.includes(format.id))
      : posterExportFormats;

  for (const format of formatsToGenerate) {
    const existingRow = existingByFormat.get(format.id);

    if (existingRow && !force) {
      nextRows.push(existingRow);
      continue;
    }

    const imageResponse = await createPosterImageResponse({
      trip,
      mission,
      photos,
      formatId: format.id,
    });

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const storagePath = getPosterExportStoragePath(trip.user_id, trip.id, format.id, Date.now());

    const { error: uploadError } = await supabase.storage.from(POSTER_EXPORT_BUCKET).upload(storagePath, imageBuffer, {
      contentType: "image/png",
      cacheControl: "31536000",
      upsert: false,
    });

    if (uploadError) {
      throw uploadError;
    }

    if (existingRow?.storage_path && existingRow.storage_path !== storagePath) {
      oldPathsToDelete.push(existingRow.storage_path);
    }

    nextRows.push({
      id: existingRow?.id ?? crypto.randomUUID(),
      trip_id: trip.id,
      format: format.id,
      storage_path: storagePath,
      image_url: getPosterExportPublicUrl(storagePath),
      generated_at: generatedAt,
    });
  }

  const rowsToUpsert = nextRows.filter((row) => {
    const existingRow = existingByFormat.get(row.format);
    return !existingRow || existingRow.storage_path !== row.storage_path;
  });

  if (rowsToUpsert.length > 0) {
    const { error: upsertError } = await supabase.from("poster_exports").upsert(rowsToUpsert, {
      onConflict: "trip_id,format",
    });

    if (upsertError) {
      throw upsertError;
    }
  }

  if (oldPathsToDelete.length > 0) {
    await supabase.storage.from(POSTER_EXPORT_BUCKET).remove(oldPathsToDelete);
  }

  return nextRows.map((row) => ({
    ...row,
    fileName: getPosterExportFileName(trip.location, row.format),
  }));
}
