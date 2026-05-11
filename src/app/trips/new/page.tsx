import Link from "next/link";
import { createTripAction } from "@/app/actions";
import { EventOnView } from "@/components/analytics/event-on-view";
import { NewTripBuilder } from "@/components/trips/new-trip-builder";
import { requireUser } from "@/lib/auth";
import { missionSeeds } from "@/lib/missions";

type NewTripPageProps = {
  searchParams: Promise<{
    challengeColor?: string;
    challengeLocation?: string;
    challengeTitle?: string;
    challengeStartDate?: string;
    challengeEndDate?: string;
    challengeShareId?: string;
  }>;
};

export default async function NewTripPage({ searchParams }: NewTripPageProps) {
  await requireUser();
  const params = await searchParams;
  const challengeColor = params.challengeColor?.trim() || "";
  const challengeLocation = params.challengeLocation?.trim() || "";
  const challengeTitle = params.challengeTitle?.trim() || "";
  const challengeStartDate = params.challengeStartDate?.trim() || "";
  const challengeEndDate = params.challengeEndDate?.trim() || "";
  const challengeShareId = params.challengeShareId?.trim() || "";
  const isChallengeFlow = Boolean(challengeColor || challengeLocation || challengeTitle);

  return (
    <main className="app-shell page-frame">
      <EventOnView
        eventName="new_trip_viewed"
        metadata={{
          availableMissionCount: missionSeeds.length,
          challengeColor: challengeColor || null,
          challengeShareId: challengeShareId || null,
        }}
      />
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-[var(--muted)]">
            ← Back to dashboard
          </Link>
        </div>

        <div className="playful-card rounded-[2.5rem] p-6 sm:p-8">
          <p className="eyebrow">{isChallengeFlow ? "New Challenge" : "New Trip"}</p>
          <h1 className="panel-title mt-3 text-3xl font-semibold sm:text-4xl">Build the challenge around one place.</h1>
          <p className="body-copy mt-3 max-w-2xl text-base">
            Keep the setup simple. Name the trip, pin the location, and choose whether the color arrives by chance or by instinct.
          </p>

          {isChallengeFlow ? (
            <div className="mt-5 rounded-[1.5rem] border border-[rgba(47,97,223,0.14)] bg-[rgba(47,97,223,0.08)] p-4">
              <p className="eyebrow">Challenge loaded</p>
              <p className="body-copy mt-2 text-sm sm:text-base">
                Start from the same place and timing, but hunt for <strong>{challengeColor || "your own color"}</strong>.
              </p>
            </div>
          ) : null}
          <NewTripBuilder
            action={createTripAction}
            missionSeeds={missionSeeds}
            challengeColor={challengeColor}
            challengeLocation={challengeLocation}
            challengeTitle={challengeTitle}
            challengeStartDate={challengeStartDate}
            challengeEndDate={challengeEndDate}
            challengeShareId={challengeShareId}
            isChallengeFlow={isChallengeFlow}
          />
        </div>
      </div>
    </main>
  );
}
