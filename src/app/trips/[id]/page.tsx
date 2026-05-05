import Link from "next/link";
import { EventOnView } from "@/components/analytics/event-on-view";
import { notFound } from "next/navigation";
import { UploadPanel } from "@/components/trips/upload-panel";
import { requireUser } from "@/lib/auth";
import { getPhotoUrl, getTripBundle } from "@/lib/data";
import { getSupabaseEnv } from "@/lib/env";

type TripDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const { id } = await params;
  const { user } = await requireUser();
  const bundle = await getTripBundle(id, user.id);

  if (!bundle) {
    notFound();
  }

  const { trip, mission, photos } = bundle;
  const filledSlots = photos.length;
  const progress = `${filledSlots}/${mission.max_photos}`;

  return (
    <main className="app-shell page-frame">
      <EventOnView
        eventName="trip_viewed"
        tripId={trip.id}
        metadata={{
          colorName: mission.color_name,
          filledSlots,
          maxPhotos: mission.max_photos,
        }}
      />
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/dashboard" className="text-sm text-[var(--muted)]">
            ← Back to dashboard
          </Link>
          <Link
            href={`/trips/${trip.id}/poster`}
            className={`${filledSlots === mission.max_photos ? "button-primary" : "button-secondary"} w-full sm:w-auto`}
          >
            {filledSlots === mission.max_photos ? "Generate poster" : "Preview poster"}
          </Link>
        </div>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <div className="glass-panel rounded-[2.5rem] p-6 sm:p-8">
              <p className="eyebrow">{trip.location}</p>
              <h1 className="panel-title mt-3 text-3xl font-semibold sm:text-4xl">{trip.title}</h1>
              <p className="body-copy mt-4 max-w-xl text-base">{mission.prompt}</p>

              <div className="mt-8 rounded-[2rem] p-5" style={{ backgroundColor: `${mission.color_hex}18` }}>
                <div className="flex items-center gap-4">
                  <div
                    className="h-14 w-14 rounded-full border border-white/70 shadow-sm"
                    style={{ backgroundColor: mission.color_hex }}
                  />
                  <div>
                    <p className="eyebrow">Active Mission</p>
                    <h2 className="panel-title mt-1 text-2xl font-semibold">{mission.color_name}</h2>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-[rgba(32,26,23,0.72)]">
                  Look for this color in ordinary details. Stop at nine frames so the final poster keeps its shape.
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-4 rounded-[1.5rem] border border-[var(--border)] bg-[rgba(255,255,255,0.45)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="eyebrow">Progress</p>
                  <p className="mt-1 text-2xl font-semibold">{progress}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">A small, complete visual story beats an endless camera roll.</p>
                </div>
                <div className="w-full rounded-full bg-white/70 p-1 sm:w-36">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.min((filledSlots / mission.max_photos) * 100, 100)}%`,
                      backgroundColor: mission.color_hex,
                    }}
                  />
                </div>
              </div>
            </div>

            <UploadPanel
              tripId={trip.id}
              missionId={mission.id}
              userId={user.id}
              currentCount={filledSlots}
              maxPhotos={mission.max_photos}
              bucketName={getSupabaseEnv().storageBucket}
              photos={photos}
            />
          </div>

          <div className="glass-panel rounded-[2.5rem] p-6 sm:p-8">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow">Photo Grid</p>
                <h2 className="panel-title mt-2 text-2xl font-semibold">Nine frames make the story.</h2>
              </div>
              <p className="text-sm text-[var(--muted)]">{filledSlots} frames placed</p>
            </div>

            {filledSlots === 0 ? (
              <div className="empty-state-card mb-5 rounded-[1.7rem] p-5">
                <p className="eyebrow">Your grid starts empty</p>
                <p className="body-copy mt-2 text-sm sm:text-base">
                  That&apos;s the point. Start with one frame that feels unmistakably {mission.color_name.toLowerCase()}, then let the rest of the hunt build around it.
                </p>
              </div>
            ) : filledSlots < mission.max_photos ? (
              <div className="soft-status-card mb-5 rounded-[1.7rem] p-5">
                <p className="eyebrow">Still collecting</p>
                <p className="body-copy mt-2 text-sm sm:text-base">
                  You&apos;re shaping the story now. The strongest posters usually mix obvious hits with two or three quieter details.
                </p>
              </div>
            ) : (
              <div className="soft-status-card mb-5 rounded-[1.7rem] p-5">
                <p className="eyebrow">Poster ready</p>
                <p className="body-copy mt-2 text-sm sm:text-base">
                  All nine frames are in. Give the sequence one last look, then move into the poster and share flow.
                </p>
              </div>
            )}

            <div className="grid-poster">
              {Array.from({ length: mission.max_photos }).map((_, index) => {
                const photo = photos[index];

                return (
                  <div key={photo?.id ?? `slot-${index}`} className="photo-tile">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getPhotoUrl(photo)} alt={photo.caption || `Trip photo ${index + 1}`} />
                    ) : (
                      <div className="photo-slot h-full w-full">
                        <div>
                          <p className="text-sm font-medium uppercase tracking-[0.18em]">Slot {index + 1}</p>
                          <p className="mt-2">A future moment in {mission.color_name.toLowerCase()}.</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
