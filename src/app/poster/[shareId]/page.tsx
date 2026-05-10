import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DownloadPosterButton } from "@/components/trips/download-poster-button";
import { SaveImageButton } from "@/components/trips/save-image-button";
import { ShareLinkButton } from "@/components/trips/share-link-button";
import { PublicPosterCtaLink, PublicPosterEvents } from "@/components/trips/public-poster-events";
import { PosterSheet } from "@/components/trips/poster-sheet";
import { getPosterExportForTrip, getPublicTripBundleByShareId } from "@/lib/data";
import { buildPosterFrameSlots, getPosterLocationLabel, getPosterTripYear, isPosterComplete } from "@/lib/poster";

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

export async function generateMetadata({ params }: PublicPosterPageProps): Promise<Metadata> {
  const { shareId } = await params;
  const bundle = await getPublicTripBundleByShareId(shareId);

  if (!bundle || !isPosterComplete(bundle.photos, bundle.mission.max_photos)) {
    return {
      title: "Poster not found",
      description: "This Color Hunt poster is no longer available.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const { trip, mission } = bundle;
  const title = `${trip.location} ${mission.color_name} poster`;
  const description = `A public Color Hunt poster from ${trip.location}. Hunt ${mission.color_name}, collect nine moments, and see the place differently.`;
  const imageUrl = `/poster/${shareId}/opengraph-image`;
  const canonicalUrl = `/poster/${shareId}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${trip.location} · ${mission.color_name} | Color Hunt`,
      description,
      type: "article",
      url: canonicalUrl,
      images: [
        {
          url: imageUrl,
          width: 1080,
          height: 1350,
          alt: `${mission.color_name} Color Hunt poster from ${trip.location}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${trip.location} · ${mission.color_name} | Color Hunt`,
      description,
      images: [imageUrl],
    },
  };
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
  const [postExport, storyExport, squareExport] = await Promise.all([
    getPosterExportForTrip(trip.id, "post"),
    getPosterExportForTrip(trip.id, "story"),
    getPosterExportForTrip(trip.id, "square"),
  ]);
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
  const posterJsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: `${trip.location} ${mission.color_name} poster`,
    description: `A public Color Hunt poster from ${trip.location}, built from nine ${mission.color_name} moments.`,
    url: `https://colorhunt.quest/poster/${shareId}`,
    image: `https://colorhunt.quest/poster/${shareId}/opengraph-image`,
    creator: {
      "@type": "Organization",
      name: "Color Hunt",
      url: "https://colorhunt.quest",
    },
    keywords: [mission.color_name, trip.location, "color hunt", "travel poster", "photo challenge"],
  };

  return (
    <main className="app-shell page-frame">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(posterJsonLd) }}
      />
      <PublicPosterEvents shareId={shareId} />
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--muted)]">Color Hunt public poster</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <SaveImageButton
              shareId={shareId}
              posterData={posterData}
              fileUrl={exportUrls.post ?? null}
              fileName={`${trip.location.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "color-hunt"}-post-4x5.png`}
              buttonLabel="Save poster"
            />
            <ShareLinkButton
              shareId={shareId}
              url={shareUrl}
              title={`Color Hunt · ${trip.location}`}
              text={`One place. One color. Nine moments. ${trip.location}`}
              fileUrl={exportUrls.post ?? null}
              buttonLabel="Share poster"
              buttonDescription="Open your phone’s share sheet"
            />
            <DownloadPosterButton shareId={shareId} exportUrls={exportUrls} buttonLabel="More formats" />
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
