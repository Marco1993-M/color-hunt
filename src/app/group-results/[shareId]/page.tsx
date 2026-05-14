import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventOnView } from "@/components/analytics/event-on-view";
import { GroupHuntResultsBoard } from "@/components/group-hunts/group-hunt-results-board";
import { ShareLinkButton } from "@/components/trips/share-link-button";
import { getPublicGroupHuntByShareId } from "@/lib/data";

type PublicGroupResultsPageProps = {
  params: Promise<{
    shareId: string;
  }>;
};

export async function generateMetadata({ params }: PublicGroupResultsPageProps): Promise<Metadata> {
  const { shareId } = await params;
  const bundle = await getPublicGroupHuntByShareId(shareId);

  if (!bundle) {
    return {
      title: "Group result not found",
      description: "This Color Hunt group result is no longer available.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `${bundle.hunt.title} · Group Result | Color Hunt`,
    description: `A finished Color Hunt group result from ${bundle.hunt.location}. Compare each assigned color story in one shared board.`,
    alternates: {
      canonical: `/group-results/${shareId}`,
    },
    openGraph: {
      title: `${bundle.hunt.title} · Group Result | Color Hunt`,
      description: `A finished Color Hunt group result from ${bundle.hunt.location}. Compare each assigned color story in one shared board.`,
      url: `/group-results/${shareId}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${bundle.hunt.title} · Group Result | Color Hunt`,
      description: `A finished Color Hunt group result from ${bundle.hunt.location}. Compare each assigned color story in one shared board.`,
    },
  };
}

export default async function PublicGroupResultsPage({ params }: PublicGroupResultsPageProps) {
  const { shareId } = await params;
  const bundle = await getPublicGroupHuntByShareId(shareId);

  if (!bundle) {
    notFound();
  }

  const completedResults = bundle.results.filter((participant) => {
    const maxPhotos = participant.max_photos ?? 9;
    return Boolean(participant.user_id) && (participant.photo_count ?? 0) >= maxPhotos;
  });
  const publishedPosterCount = completedResults.filter((participant) => participant.trip?.is_public && participant.trip?.share_id).length;
  const totalFrames = completedResults.reduce((count, participant) => count + (participant.photo_count ?? 0), 0);
  const shareUrl = `/group-results/${shareId}`;

  return (
    <main className="app-shell page-frame">
      <EventOnView
        eventName="group_result_viewed"
        metadata={{
          groupHuntId: bundle.hunt.id,
          completedParticipantCount: completedResults.length,
          publishedPosterCount,
        }}
      />
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--muted)]">Color Hunt group result</p>
          <Link href="/" className="text-sm text-[var(--muted)]">
            Start your own hunt →
          </Link>
        </div>

        <div className="playful-card rounded-[2.5rem] p-6 sm:p-8">
          <p className="eyebrow">Combined Group Artifact</p>
          <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)] lg:items-end">
            <div>
              <h1 className="panel-title text-3xl font-semibold sm:text-4xl">{bundle.hunt.title}</h1>
              <p className="body-copy mt-3 max-w-2xl text-base">
                {bundle.hunt.location}
                {bundle.hunt.start_date || bundle.hunt.end_date
                  ? ` · ${bundle.hunt.start_date || "No start date"}${bundle.hunt.end_date ? ` to ${bundle.hunt.end_date}` : ""}`
                  : ""}
              </p>
              <p className="body-copy mt-4 max-w-3xl text-sm sm:text-base">
                Same place, different eyes. This finished Color Hunt board brings every assigned color story into one shared artifact, so the group can compare how the same day looked completely different through each person’s hunt.
              </p>
            </div>

            <div className="rounded-[1.6rem] border border-[rgba(53,37,30,0.08)] bg-[rgba(255,255,255,0.68)] p-4">
              <p className="eyebrow">Share this result</p>
              <p className="body-copy mt-2 text-sm">
                Send one link that shows the whole group outcome instead of nine separate screenshots and explanations.
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <ShareLinkButton
                  url={shareUrl}
                  title={`Color Hunt Group Result · ${bundle.hunt.location}`}
                  text={`A finished Color Hunt group result from ${bundle.hunt.location}. Compare each assigned color story in one shared board.`}
                  buttonLabel="Share group result"
                  buttonDescription="Send the combined group artifact from your phone’s native share sheet"
                  eventName="group_result_shared_native"
                  metadata={{
                    groupHuntId: bundle.hunt.id,
                  }}
                  className="button-primary w-full"
                />
                <a className="button-secondary w-full text-center" href="/">
                  Start your own group hunt
                </a>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.25rem] border border-[rgba(53,37,30,0.08)] bg-[rgba(255,255,255,0.82)] px-4 py-3">
              <p className="eyebrow">Completed stories</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">{completedResults.length}</p>
            </div>
            <div className="rounded-[1.25rem] border border-[rgba(53,37,30,0.08)] bg-[rgba(255,255,255,0.82)] px-4 py-3">
              <p className="eyebrow">Published posters</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">{publishedPosterCount}</p>
            </div>
            <div className="rounded-[1.25rem] border border-[rgba(53,37,30,0.08)] bg-[rgba(255,255,255,0.82)] px-4 py-3">
              <p className="eyebrow">Frames collected</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">{totalFrames}</p>
            </div>
          </div>

          <GroupHuntResultsBoard
            hostUserId={bundle.hunt.host_user_id}
            participants={bundle.results}
            heading="Every color story, in one place."
            description="Each participant hunted a different color in the same shared moment. The result is one board that shows how much perspective changes what a place becomes."
          />
        </div>
      </div>
    </main>
  );
}
