import { notFound } from "next/navigation";
import { DownloadPosterButton } from "@/components/trips/download-poster-button";
import { PublicPosterCtaLink, PublicPosterEvents } from "@/components/trips/public-poster-events";
import { PosterSheet } from "@/components/trips/poster-sheet";
import { getPublicTripBundleByShareId } from "@/lib/data";
import { isPosterComplete } from "@/lib/poster";

type PublicPosterPageProps = {
  params: Promise<{ shareId: string }>;
};

export default async function PublicPosterPage({ params }: PublicPosterPageProps) {
  const { shareId } = await params;
  const bundle = await getPublicTripBundleByShareId(shareId);

  if (!bundle) {
    notFound();
  }

  const { trip, mission, photos } = bundle;

  if (!isPosterComplete(photos, mission.max_photos)) {
    notFound();
  }

  return (
    <main className="app-shell page-frame">
      <PublicPosterEvents shareId={shareId} />
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--muted)]">Color Hunt public poster</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <DownloadPosterButton shareId={shareId} />
            <PublicPosterCtaLink shareId={shareId} />
          </div>
        </div>

        <PosterSheet
          id="public-poster-sheet"
          trip={trip}
          mission={mission}
          photos={photos}
          footer={
            <div className="rounded-[1.5rem] border border-[rgba(53,37,30,0.1)] bg-white/55 p-4 text-center">
              <p className="text-sm leading-7 text-[var(--muted)]">
                Color Hunt by colorhunt.quest. One place. One color. Nine moments. See places differently.
              </p>
            </div>
          }
        />
      </div>
    </main>
  );
}
