import Link from "next/link";
import { createGroupHuntAction, createQuickHuntAction, createTripAction } from "@/app/actions";
import { EventOnView } from "@/components/analytics/event-on-view";
import { NewHuntBuilder } from "@/components/trips/new-hunt-builder";
import { NewTripBuilder } from "@/components/trips/new-trip-builder";
import { requireUser } from "@/lib/auth";
import { isCoverTripLike } from "@/lib/covers";
import { getTripBundle } from "@/lib/data";
import { getSupabaseEnv } from "@/lib/env";
import { missionSeeds } from "@/lib/missions";

type NewTripPageProps = {
  searchParams: Promise<{
    challengeColor?: string;
    challengeLocation?: string;
    challengeTitle?: string;
    challengeStartDate?: string;
    challengeEndDate?: string;
    challengeShareId?: string;
    draft?: string;
    mode?: string;
  }>;
};

export default async function NewTripPage({ searchParams }: NewTripPageProps) {
  const { user } = await requireUser();
  const params = await searchParams;
  const isGroupMode = params.mode === "group";
  const challengeColor = params.challengeColor?.trim() || "";
  const challengeLocation = params.challengeLocation?.trim() || "";
  const challengeTitle = params.challengeTitle?.trim() || "";
  const challengeStartDate = params.challengeStartDate?.trim() || "";
  const challengeEndDate = params.challengeEndDate?.trim() || "";
  const challengeShareId = params.challengeShareId?.trim() || "";
  const isChallengeFlow = Boolean(challengeColor || challengeLocation || challengeTitle);
  const draftBundle = params.draft ? await getTripBundle(params.draft, user.id) : null;
  const isSoloDraft = Boolean(
    draftBundle &&
      !draftBundle.trip.group_hunt_id &&
      !isCoverTripLike({ trip: draftBundle.trip, mission: draftBundle.mission }),
  );

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
      <div className={isGroupMode ? "mx-auto max-w-3xl" : "mx-auto max-w-5xl"}>
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-[var(--muted)]">
            ← Back to dashboard
          </Link>
        </div>

        {isGroupMode ? <div className="playful-card rounded-[2.5rem] p-6 sm:p-8">
          <p className="eyebrow">{isChallengeFlow ? "New Challenge" : "Group hunt"}</p>
          <h1 className="panel-title mt-3 text-3xl font-semibold sm:text-4xl">Build the challenge around one place.</h1>
          <p className="body-copy mt-3 max-w-2xl text-base">Set the shared place, timing, and color assignments for everyone joining in.</p>
          {isChallengeFlow ? (
            <div className="mt-5 rounded-[1.5rem] border border-[rgba(47,97,223,0.14)] bg-[rgba(47,97,223,0.08)] p-4">
              <p className="eyebrow">Challenge loaded</p>
              <p className="body-copy mt-2 text-sm sm:text-base">
                Start from the same place and timing, but hunt for <strong>{challengeColor || "your own color"}</strong>.
              </p>
            </div>
          ) : null}
          <NewTripBuilder
            createSoloAction={createTripAction}
            createGroupAction={createGroupHuntAction}
            missionSeeds={missionSeeds}
            challengeColor={challengeColor}
            challengeLocation={challengeLocation}
            challengeTitle={challengeTitle}
            challengeStartDate={challengeStartDate}
            challengeEndDate={challengeEndDate}
            challengeShareId={challengeShareId}
            isChallengeFlow={isChallengeFlow}
          />
        </div> : <NewHuntBuilder
          createAction={createQuickHuntAction}
          missionSeeds={missionSeeds}
          userId={user.id}
          bucketName={getSupabaseEnv().storageBucket}
          initialDraft={isSoloDraft && draftBundle ? {
            tripId: draftBundle.trip.id,
            missionId: draftBundle.mission.id,
            title: draftBundle.trip.title,
            location: draftBundle.trip.location,
            colorName: draftBundle.mission.color_name,
            colorHex: draftBundle.mission.color_hex,
            prompt: draftBundle.mission.prompt,
            photos: draftBundle.photos,
          } : null}
        />}
      </div>
    </main>
  );
}
