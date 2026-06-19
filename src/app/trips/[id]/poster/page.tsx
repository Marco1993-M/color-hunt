import Link from "next/link";
import { EventOnView } from "@/components/analytics/event-on-view";
import { notFound } from "next/navigation";
import { CoverPosterPreview } from "@/components/covers/cover-poster-preview";
import { PosterPhotoPlacementEditor } from "@/components/trips/poster-photo-placement-editor";
import { PosterSheet } from "@/components/trips/poster-sheet";
import { SocialUpgradePanel } from "@/components/auth/social-upgrade-panel";
import { PosterExportWarmup } from "@/components/trips/poster-export-warmup";
import { PosterReadyWatcher } from "@/components/trips/poster-ready-watcher";
import { EditTripTitleForm } from "@/components/trips/edit-trip-title-form";
import { SharePosterPanel } from "@/components/trips/share-poster-panel";
import { SaveImageButton } from "@/components/trips/save-image-button";
import { requireUser } from "@/lib/auth";
import { getCoverTemplate, getCoverThemeId, inferCoverTemplateId, isCoverTripLike } from "@/lib/covers";
import { getPosterExportForTrip, getTripBundle, getTripShareState } from "@/lib/data";
import { buildPosterFrameSlots, buildPosterPhotoPlacements, getPosterLocationLabel, getPosterTitleLabel, getPosterTripYear, isPosterComplete } from "@/lib/poster";
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
  const isCoverTrip = isCoverTripLike({ trip, mission });
  const coverTemplateId = inferCoverTemplateId({ trip, mission });
  const coverTemplate = getCoverTemplate(coverTemplateId);
  const coverThemeId = getCoverThemeId(coverTemplateId);
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
  const posterTitle = getPosterTitleLabel(trip.title, trip.location);
  const posterData = {
    posterTitle,
    locationLabel: getPosterLocationLabel(trip.location),
    location: trip.location,
    missionColorName: mission.color_name,
    tripYear: getPosterTripYear(trip.created_at, trip.start_date, trip.end_date),
    posterTone: mission.color_hex,
    photoUrls: buildPosterFrameSlots(photos).map((photo) => photo?.image_url ?? null),
    photoPlacements: buildPosterPhotoPlacements(photos, mission.max_photos),
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
          creationMode: isCoverTrip ? "cover" : trip.creation_mode ?? "hunt",
          coverTemplate: isCoverTrip ? coverTemplate.id : trip.cover_template ?? null,
        }}
      />
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Link href={`/trips/${trip.id}`} className="text-sm text-[var(--muted)]">
            ← Back to trip
          </Link>
          <p className="text-sm text-[var(--muted)]">
            {isCoverTrip
              ? isComplete
                ? "Cover ready to save"
                : "Cover preview"
              : isComplete
                ? isGuest
                  ? "Poster ready to save"
                  : "Poster ready to share"
                : "Poster preview"}
          </p>
        </div>

        {!isComplete ? (
          <div className="mb-6 rounded-[1.6rem] border border-[rgba(53,37,30,0.1)] bg-white/60 p-4">
            <p className="eyebrow">{isCoverTrip ? "Finish the cover" : "Finish the hunt"}</p>
            <p className="body-copy mt-2 text-sm sm:text-base">
              {isCoverTrip
                ? `You can preview the cover as you go, but downloads unlock once all ${mission.max_photos} frames are filled.`
                : `You can preview the poster as you go, but public sharing and downloads unlock once all ${mission.max_photos} frames are filled.`}
            </p>
          </div>
        ) : null}

        {!isCoverTrip ? (
          <div className="mb-6 max-w-2xl">
            <EditTripTitleForm tripId={trip.id} currentTitle={trip.title} location={trip.location} compact />
          </div>
        ) : null}

        {isCoverTrip ? (
          <CoverPosterPreview
            templateId={coverTemplate.id}
            photos={buildPosterFrameSlots(photos, 4)}
            title={posterTitle}
          />
        ) : (
          <>
            <PosterSheet id="trip-poster-sheet" trip={trip} mission={mission} photos={photos} />
            <PosterExportWarmup tripId={trip.id} enabled={isComplete} />
            <PosterReadyWatcher tripId={trip.id} enabled={isComplete} hasPostExport={Boolean(exportUrls.post)} />
          </>
        )}

        <div className="mt-6">
          <PosterPhotoPlacementEditor
            tripId={trip.id}
            missionMaxPhotos={mission.max_photos}
            photos={photos}
            isCoverTrip={isCoverTrip}
          />
        </div>

        <div className="mt-6">
          {!isComplete ? (
            isGuest ? (
              <div className="glass-panel rounded-[1.8rem] p-5 sm:p-6">
                <p className="eyebrow">Guest mode</p>
                <h3 className="panel-title mt-2 text-2xl font-semibold">
                  {isCoverTrip ? "Finish the four first." : "Finish the nine first."}
                </h3>
                <p className="body-copy mt-3 text-sm sm:text-base">
                  {isCoverTrip
                    ? `You can preview the cover as a guest, then attach Google once all ${mission.max_photos} frames are filled and the cover is ready to keep.`
                    : `You can preview the poster as a guest, then attach Google once all ${mission.max_photos} frames are filled and the poster is ready to keep.`}
                </p>
              </div>
            ) : isCoverTrip ? (
              <div className="glass-panel rounded-[1.8rem] p-5 sm:p-6">
                <p className="eyebrow">Cover actions</p>
                <h3 className="panel-title mt-2 text-2xl font-semibold">Finish the four first.</h3>
                <p className="body-copy mt-3 text-sm sm:text-base">
                  Save actions unlock once all {mission.max_photos} photos are filled. This cover flow stays separate from the nine-frame poster share flow.
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
          ) : isCoverTrip ? (
            <div className="glass-panel rounded-[1.8rem] p-5 sm:p-6">
              <p className="eyebrow">Cover actions</p>
              <h3 className="panel-title mt-2 text-2xl font-semibold">Save the cover.</h3>
              <p className="body-copy mt-3 max-w-2xl text-sm sm:text-base">
                This cover template is a four-photo format. Save it straight to your phone and share it however you want.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <SaveImageButton
                  tripId={trip.id}
                  posterData={posterData}
                  fileName={`${trip.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "color-hunt"}-${coverTemplate.id}-cover-4x5.png`}
                  buttonLabel="Save cover"
                  formatId="post"
                  themeId={coverThemeId}
                />
              </div>
              <p className="body-copy mt-4 text-xs sm:text-sm">
                Public cover links will come later. Right now this path is focused on fast save-and-share output.
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
          )}
        </div>
      </div>
    </main>
  );
}
