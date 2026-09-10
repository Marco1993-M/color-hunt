import { createHash } from "node:crypto";
import type { Trip, Mission, Photo } from "./types";

export function getPosterRevision({ trip, mission, photos }: { trip: Trip; mission: Mission; photos: Photo[] }) {
  // Signed URLs expire independently of the source image and must not change the revision.
  return createHash("sha256").update(JSON.stringify({
    renderer: 2,
    trip: [trip.title, trip.location, trip.created_at, trip.creation_mode, trip.cover_template, trip.title_style],
    mission: [mission.color_name, mission.color_hex, mission.max_photos],
    photos: photos.map(photo => [photo.id, photo.storage_path, photo.sort_order, photo.poster_focal_x ?? 0.5, photo.poster_focal_y ?? 0.5, photo.poster_zoom ?? 1, photo.photo_filter ?? "none"]),
  })).digest("hex");
}
