import { notFound } from "next/navigation";
import { DownloadPosterButton } from "@/components/trips/download-poster-button";
import { ShareLinkButton } from "@/components/trips/share-link-button";
import { PublicPosterCtaLink, PublicPosterEvents } from "@/components/trips/public-poster-events";
import { PosterSheet } from "@/components/trips/poster-sheet";
import { getPublicTripBundleByShareId } from "@/lib/data";
import { isPosterComplete } from "@/lib/poster";

type PublicPosterPageProps = {
  params: Promise<{ shareId: string }>;
  searchParams: Promise<{
    challengeColor?: string;
    challengeLocation?: string;
    challengeTitle?: string;
    challengeStartDate?: string;
    challengeEndDate?: string;
    challengeShareId?: string;
  }>;
};

function buildChallengeStartHref({
  challengeColor,
  challengeLocation,
  challengeTitle,
  challengeStartDate,
  challengeEndDate,
  challengeShareId,
}: {
  challengeColor?: string;
  challengeLocation?: string;
  challengeTitle?: string;
  challengeStartDate?: string;
  challengeEndDate?: string;
  challengeShareId?: string;
}) {
  const nextParams = new URLSearchParams();
  if (challengeColor) nextParams.set("challengeColor", challengeColor);
  if (challengeLocation) nextParams.set("challengeLocation", challengeLocation);
  if (challengeTitle) nextParams.set("challengeTitle", challengeTitle);
  if (challengeStartDate) nextParams.set("challengeStartDate", challengeStartDate);
  if (challengeEndDate) nextParams.set("challengeEndDate", challengeEndDate);
  if (challengeShareId) nextParams.set("challengeShareId", challengeShareId);
  const query = nextParams.toString();
  return query ? `/?${query}#start` : "/";
}

export default async function PublicPosterPage({ params, searchParams }: PublicPosterPageProps) {
  const { shareId } = await params;
  const challengeParams = await searchParams;
  const bundle = await getPublicTripBundleByShareId(shareId);

  if (!bundle) {
    notFound();
  }

  const { trip, mission, photos } = bundle;

  if (!isPosterComplete(photos, mission.max_photos)) {
    notFound();
  }

  const challengeColor = challengeParams.challengeColor?.trim() || mission.color_name;
  const challengeLocation = challengeParams.challengeLocation?.trim() || trip.location;
  const challengeTitle = challengeParams.challengeTitle?.trim() || trip.title;
  const challengeStartDate = challengeParams.challengeStartDate?.trim() || trip.start_date || "";
  const challengeEndDate = challengeParams.challengeEndDate?.trim() || trip.end_date || "";
  const challengeHref = buildChallengeStartHref({
    challengeColor,
    challengeLocation,
    challengeTitle,
    challengeStartDate,
    challengeEndDate,
    challengeShareId: shareId,
  });
  const shareUrl = `/poster/${shareId}`;

  return (
    <main className="app-shell page-frame">
      <PublicPosterEvents shareId={shareId} />
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--muted)]">Color Hunt public poster</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ShareLinkButton
              shareId={shareId}
              url={shareUrl}
              title={`Color Hunt · ${trip.location}`}
              text={`One place. One color. Nine moments. ${trip.location}`}
              fileUrl={`/poster/${shareId}/download?format=post`}
              buttonLabel="Save image"
              buttonDescription="Open your phone’s share sheet to save the poster image"
            />
            <DownloadPosterButton shareId={shareId} />
            <PublicPosterCtaLink
              shareId={shareId}
              href={challengeHref}
              label={`Take the ${challengeColor} challenge`}
            />
          </div>
        </div>

        <div className="mb-6 rounded-[1.5rem] border border-[rgba(47,97,223,0.12)] bg-[rgba(255,255,255,0.55)] p-4">
          <p className="eyebrow">Challenge this poster</p>
          <p className="body-copy mt-2 text-sm sm:text-base">
            Same place, same trip window, different eye. Start your own <strong>{challengeColor}</strong> version of this Color Hunt.
          </p>
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
