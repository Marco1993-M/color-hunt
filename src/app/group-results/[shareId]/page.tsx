import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GroupHuntResultsBoard } from "@/components/group-hunts/group-hunt-results-board";
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
  };
}

export default async function PublicGroupResultsPage({ params }: PublicGroupResultsPageProps) {
  const { shareId } = await params;
  const bundle = await getPublicGroupHuntByShareId(shareId);

  if (!bundle) {
    notFound();
  }

  return (
    <main className="app-shell page-frame">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--muted)]">Color Hunt group result</p>
          <Link href="/" className="text-sm text-[var(--muted)]">
            Start your own hunt →
          </Link>
        </div>

        <div className="playful-card rounded-[2.5rem] p-6 sm:p-8">
          <p className="eyebrow">Combined Group Artifact</p>
          <h1 className="panel-title mt-3 text-3xl font-semibold sm:text-4xl">{bundle.hunt.title}</h1>
          <p className="body-copy mt-3 max-w-2xl text-base">
            {bundle.hunt.location}
            {bundle.hunt.start_date || bundle.hunt.end_date
              ? ` · ${bundle.hunt.start_date || "No start date"}${bundle.hunt.end_date ? ` to ${bundle.hunt.end_date}` : ""}`
              : ""}
          </p>
          <p className="body-copy mt-4 max-w-3xl text-sm sm:text-base">
            Same place, different eyes. This is the finished Color Hunt group board, showing how each participant turned one assigned color into a nine-frame story.
          </p>

          <GroupHuntResultsBoard hostUserId={bundle.hunt.host_user_id} participants={bundle.results} />
        </div>
      </div>
    </main>
  );
}
