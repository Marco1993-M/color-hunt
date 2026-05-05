import Link from "next/link";
import { createTripAction } from "@/app/actions";
import { EventOnView } from "@/components/analytics/event-on-view";
import { requireUser } from "@/lib/auth";
import { missionSeeds } from "@/lib/missions";

export default async function NewTripPage() {
  await requireUser();

  return (
    <main className="app-shell page-frame">
      <EventOnView eventName="new_trip_viewed" metadata={{ availableMissionCount: missionSeeds.length }} />
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-[var(--muted)]">
            ← Back to dashboard
          </Link>
        </div>

        <div className="playful-card rounded-[2.5rem] p-6 sm:p-8">
          <p className="eyebrow">New Trip</p>
          <h1 className="panel-title mt-3 text-3xl font-semibold sm:text-4xl">Build the challenge around one place.</h1>
          <p className="body-copy mt-3 max-w-2xl text-base">
            Keep the setup simple. Name the trip, pin the location, and choose whether the color arrives by chance or by instinct.
          </p>

          <form action={createTripAction} className="mt-8 grid gap-5">
            <div>
              <label className="field-label" htmlFor="title">
                Trip title
              </label>
              <input id="title" name="title" className="field-input" placeholder="Lisbon after blue hour" required />
            </div>

            <div>
              <label className="field-label" htmlFor="location">
                Location
              </label>
              <input id="location" name="location" className="field-input" placeholder="Lisbon, Portugal" required />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="start_date">
                  Start date
                </label>
                <input id="start_date" name="start_date" className="field-input" type="date" />
              </div>

              <div>
                <label className="field-label" htmlFor="end_date">
                  End date
                </label>
                <input id="end_date" name="end_date" className="field-input" type="date" />
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="color_name">
                Color mission
              </label>
              <select id="color_name" name="color_name" className="field-input" defaultValue="random">
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
