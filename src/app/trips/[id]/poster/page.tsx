import Link from "next/link";
import { EventOnView } from "@/components/analytics/event-on-view";
import { notFound } from "next/navigation";
import { PosterSheet } from "@/components/trips/poster-sheet";
import { SharePosterPanel } from "@/components/trips/share-poster-panel";
import { requireUser } from "@/lib/auth";
import { getTripBundle, getTripShareState } from "@/lib/data";
import { isPosterComplete } from "@/lib/poster";

type PosterPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PosterPage({ params }: PosterPageProps) {
  const { id } = await params;
  const { user } = await requireUser();
  const [bundle, shareState] = await Promise.all([getTripBundle(id, user.id), getTripShareState(id, user.id)]);

  if (!bundle) {
    notFound();
  }

  const { trip, mission, photos } = bundle;
  const isComplete = isPosterComplete(photos, mission.max_photos);

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
          <p className="text-sm text-[var(--muted)]">{isComplete ? "Poster ready to share" : "Poster preview"}</p>
        </div>

        {!isComplete ? (
          <div className="mb-6 rounded-[1.6rem] border border-[rgba(53,37,30,0.1)] bg-white/60 p-4">
            <p className="eyebrow">Finish the hunt</p>
            <p className="body-copy mt-2 text-sm sm:text-base">
              You can preview the poster as you go, but public sharing and downloads unlock once all {mission.max_photos} frames are filled.
            </p>
          </div>
        ) : null}

        <PosterSheet trip={trip} mission={mission} photos={photos} />

        <div className="mt-6">
          <SharePosterPanel
            tripId={trip.id}
            initialShareId={shareState.shareId}
            initialIsPublic={shareState.isPublic}
            schemaReady={shareState.schemaReady}
            currentPhotoCount={photos.length}
            maxPhotos={mission.max_photos}
          />
        </div>
      </div>
    </main>
  );
}
