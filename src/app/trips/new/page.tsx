import Link from "next/link";
import { createTripAction } from "@/app/actions";
import { EventOnView } from "@/components/analytics/event-on-view";
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

          <form action={createTripAction} className="mt-8 grid gap-5">
            {challengeShareId ? <input type="hidden" name="challenge_share_id" value={challengeShareId} /> : null}
            {challengeColor ? <input type="hidden" name="challenge_color_name" value={challengeColor} /> : null}
            <div>
              <label className="field-label" htmlFor="title">
                Trip title
              </label>
              <input
                id="title"
                name="title"
                className="field-input"
                placeholder="Lisbon after blue hour"
                defaultValue={challengeTitle}
                required
              />
            </div>

            <div>
              <label className="field-label" htmlFor="location">
                Location
              </label>
              <input
                id="location"
                name="location"
                className="field-input"
                placeholder="Lisbon, Portugal"
                defaultValue={challengeLocation}
                required
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="start_date">
                  Start date
                </label>
                <input id="start_date" name="start_date" className="field-input" type="date" defaultValue={challengeStartDate} />
              </div>

              <div>
                <label className="field-label" htmlFor="end_date">
                  End date
                </label>
                <input id="end_date" name="end_date" className="field-input" type="date" defaultValue={challengeEndDate} />
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="color_name">
                Color mission
              </label>
              <select id="color_name" name="color_name" className="field-input" defaultValue={challengeColor || "random"}>
                <option value="random">Random color</option>
                {missionSeeds.map((mission) => (
                  <option key={mission.color_name} value={mission.color_name}>
                    {mission.color_name} · {mission.prompt}
                  </option>
                ))}
              </select>
            </div>

            <button className="button-primary mt-2 w-full sm:w-fit" type="submit">
              Create the trip
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
