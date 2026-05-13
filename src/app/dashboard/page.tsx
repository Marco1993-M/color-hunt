import Link from "next/link";
import { EventOnView } from "@/components/analytics/event-on-view";
import { PostAuthUpgradeResume } from "@/components/auth/post-auth-upgrade-resume";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireUser } from "@/lib/auth";
import { ensureProfile, getGroupHuntsForUser, getTripsForUser } from "@/lib/data";
import { isAnonymousUser } from "@/lib/user-state";

export default async function DashboardPage() {
  const { user } = await requireUser();
  await ensureProfile(user);
  const [trips, groupHunts] = await Promise.all([getTripsForUser(user.id), getGroupHuntsForUser(user.id)]);
  const isGuest = isAnonymousUser(user);
  const hasGroupHunts = groupHunts.hosted.length > 0 || groupHunts.joined.length > 0;

  return (
    <main className="app-shell page-frame">
      <PostAuthUpgradeResume />
      <EventOnView
        eventName="dashboard_viewed"
        metadata={{
          tripCount: trips.length,
          hostedGroupHuntCount: groupHunts.hosted.length,
          joinedGroupHuntCount: groupHunts.joined.length,
          isAnonymous: isGuest,
        }}
      />
      <div className="mx-auto max-w-6xl">
        <header className="playful-card flex flex-col gap-6 rounded-[2rem] p-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">{isGuest ? "Guest dashboard" : "Dashboard"}</p>
            <h1 className="panel-title mt-2 text-3xl font-semibold sm:text-4xl">Your color hunts</h1>
            <p className="body-copy mt-3 max-w-2xl text-base">
              {isGuest
                ? "Finish the nine-frame challenge, then attach Google so this poster is properly saved to your account."
                : "Keep the loop tight: choose a place, finish the nine-frame challenge, and shape the result into a poster."}
            </p>
            {isGuest ? (
              <p className="mt-4 inline-flex rounded-full border border-[rgba(47,97,223,0.14)] bg-[rgba(47,97,223,0.08)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(47,97,223,0.86)]">
                Guest session · Save with Google from the poster page
              </p>
            ) : null}
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
            <Link className="button-primary w-full sm:w-auto" href="/trips/new">
              Create a new trip
            </Link>
            <SignOutButton isAnonymous={isGuest} />
          </div>
        </header>

        {hasGroupHunts ? (
          <section className="mt-8 space-y-8">
            {groupHunts.hosted.length > 0 ? (
              <div>
                <div className="mb-4">
                  <p className="eyebrow">Hosting</p>
                  <h2 className="panel-title mt-2 text-2xl font-semibold">Group hunts you’re running</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {groupHunts.hosted.map((hunt) => (
                    <Link
                      key={hunt.id}
                      href={`/group-hunts/${hunt.id}`}
                      className="playful-card rounded-[2rem] p-5 transition-transform duration-150 hover:-translate-y-1 sm:p-6"
                    >
                      <p className="eyebrow">{hunt.location}</p>
                      <h3 className="panel-title mt-3 text-xl font-semibold sm:text-2xl">{hunt.title}</h3>
                      <p className="body-copy mt-3 text-sm">
                        {hunt.group_size} people · {hunt.status}
                      </p>
                      <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--muted-strong)]">
                        Open the group hunt
                        <span aria-hidden="true">→</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {groupHunts.joined.length > 0 ? (
              <div>
                <div className="mb-4">
                  <p className="eyebrow">Joined Hunts</p>
                  <h2 className="panel-title mt-2 text-2xl font-semibold">Shared hunts you’re part of</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {groupHunts.joined.map(({ hunt, participant, tripId }) => (
                    <Link
                      key={hunt.id}
                      href={tripId ? `/trips/${tripId}` : `/group-hunts/${hunt.id}`}
                      className="playful-card rounded-[2rem] p-5 transition-transform duration-150 hover:-translate-y-1 sm:p-6"
                    >
                      <p className="eyebrow">{hunt.location}</p>
                      <h3 className="panel-title mt-3 text-xl font-semibold sm:text-2xl">{hunt.title}</h3>
                      <p className="body-copy mt-3 text-sm">
                        {participant ? `${participant.assigned_color_name} · ${participant.status}` : hunt.status}
                      </p>
                      <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--muted-strong)]">
                        Open the hunt
                        <span aria-hidden="true">→</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="mt-8">
          {trips.length === 0 && !hasGroupHunts ? (
            <div className="empty-state-card rounded-[2rem] p-10 text-center">
              <p className="eyebrow">No trips yet</p>
              <h2 className="panel-title mt-3 text-2xl font-semibold">Start with one place and one color.</h2>
              <p className="body-copy mt-3 text-base">
                Your first trip sets the tone: create it, collect nine moments, and finish with something worth sharing.
              </p>
              <Link className="button-primary mt-6" href="/trips/new">
                Start a Color Hunt
              </Link>
            </div>
          ) : trips.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {trips.map((trip) => (
                <Link key={trip.id} href={`/trips/${trip.id}`} className="playful-card rounded-[2rem] p-5 transition-transform duration-150 hover:-translate-y-1 sm:p-6">
                  <p className="eyebrow">{trip.location}</p>
                  <h2 className="panel-title mt-3 text-xl font-semibold sm:text-2xl">{trip.title}</h2>
                  <p className="body-copy mt-3 text-sm">
                    {trip.start_date || "No start date"} {trip.end_date ? `- ${trip.end_date}` : ""}
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--muted-strong)]">
                    Open the trip
                    <span aria-hidden="true">→</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
