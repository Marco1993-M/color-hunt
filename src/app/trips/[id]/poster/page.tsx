import Link from "next/link";
import { EventOnView } from "@/components/analytics/event-on-view";
import { notFound } from "next/navigation";
import { PosterSheet } from "@/components/trips/poster-sheet";
import { SocialUpgradePanel } from "@/components/auth/social-upgrade-panel";
import { PosterExportWarmup } from "@/components/trips/poster-export-warmup";
import { PosterReadyWatcher } from "@/components/trips/poster-ready-watcher";
import { SharePosterPanel } from "@/components/trips/share-poster-panel";
import { requireUser } from "@/lib/auth";
import { getPosterExportForTrip, getTripBundle, getTripShareState } from "@/lib/data";
import { buildPosterFrameSlots, getPosterLocationLabel, getPosterTripYear, isPosterComplete } from "@/lib/poster";
import { isAnonymousUser } from "@/lib/user-state";

type PosterPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PosterPage({ params }: PosterPageProps) {
  const { id } = await params;
  const { user } = await requireUser();
  const [bundle, shareState] = await Promise.all([getTripBundle(id, user.id), getTripShareState(id, user.id)]);
  const isGuest = isAnonymousUser(user);

  if (!bundle) {
    notFound();
  }

  const { trip, mission, photos } = bundle;
  const isComplete = isPosterComplete(photos, mission.max_photos);
  const [postExport, storyExport, squareExport] = isComplete
    ? await Promise.all([
        getPosterExportForTrip(trip.id, "post"),
        getPosterExportForTrip(trip.id, "story"),
        getPosterExportForTrip(trip.id, "square"),
      ])
    : [null, null, null];
  const exportUrls = {
    post: postExport?.image_url,
    story: storyExport?.image_url,
    square: squareExport?.image_url,
  };
  const posterData = {
    locationLabel: getPosterLocationLabel(trip.location),
    location: trip.location,
    tripYear: getPosterTripYear(trip.created_at, trip.start_date, trip.end_date),
    posterTone: mission.color_hex,
    photoUrls: buildPosterFrameSlots(photos).map((photo) => photo?.image_url ?? null),
  };

  return (
    <main className="app-shell page-frame">
      <EventOnView
        eventName="poster_preview_opened"
        tripId={trip.id}
        metadata={{
          colorName: mission.color_name,
          filledSlots: photos.length,
          isComplete,
          maxPhotos: mission.max_photos,
        }}
      />
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Link href={`/trips/${trip.id}`} className="text-sm text-[var(--muted)]">
            ← Back to trip
          </Link>
          <p className="text-sm text-[var(--muted)]">
            {isComplete ? (isGuest ? "Poster ready to save" : "Poster ready to share") : "Poster preview"}
          </p>
        </div>

        {!isComplete ? (
          <div className="mb-6 rounded-[1.6rem] border border-[rgba(53,37,30,0.1)] bg-white/60 p-4">
            <p className="eyebrow">Finish the hunt</p>
            <p className="body-copy mt-2 text-sm sm:text-base">
              You can preview the poster as you go, but public sharing and downloads unlock once all {mission.max_photos} frames are filled.
            </p>
          </div>
        ) : null}

        <PosterSheet id="trip-poster-sheet" trip={trip} mission={mission} photos={photos} />
        <PosterExportWarmup tripId={trip.id} enabled={isComplete} />
        <PosterReadyWatcher tripId={trip.id} enabled={isComplete} hasPostExport={Boolean(exportUrls.post)} />

        <div className="mt-6">
          {!isComplete ? (
            isGuest ? (
              <div className="glass-panel rounded-[1.8rem] p-5 sm:p-6">
                <p className="eyebrow">Guest mode</p>
                <h3 className="panel-title mt-2 text-2xl font-semibold">Finish the nine first.</h3>
                <p className="body-copy mt-3 text-sm sm:text-base">
                  You can preview the poster as a guest, then attach Google once all {mission.max_photos} frames are filled and the poster is ready to keep.
                </p>
              </div>
            ) : (
              <SharePosterPanel
                tripId={trip.id}
                initialShareId={shareState.shareId}
                initialIsPublic={shareState.isPublic}
                schemaReady={shareState.schemaReady}
                currentPhotoCount={photos.length}
                maxPhotos={mission.max_photos}
                tripTitle={trip.title}
                location={trip.location}
                startDate={trip.start_date}
                endDate={trip.end_date}
                missionColorName={mission.color_name}
                exportUrls={exportUrls}
                posterData={posterData}
              />
            )
          ) : isGuest ? (
            <SocialUpgradePanel tripId={trip.id} nextPath={`/trips/${trip.id}/poster`} />
          ) : (
            <SharePosterPanel
              tripId={trip.id}
              initialShareId={shareState.shareId}
              initialIsPublic={shareState.isPublic}
              schemaReady={shareState.schemaReady}
              currentPhotoCount={photos.length}
              maxPhotos={mission.max_photos}
              tripTitle={trip.title}
              location={trip.location}
              startDate={trip.start_date}
              endDate={trip.end_date}
              missionColorName={mission.color_name}
              exportUrls={exportUrls}
              posterData={posterData}
            />
          )}
        </div>
      </div>
    </main>
  );
}
