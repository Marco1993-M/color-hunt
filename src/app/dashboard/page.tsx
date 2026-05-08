import Link from "next/link";
import { EventOnView } from "@/components/analytics/event-on-view";
import { PostAuthUpgradeResume } from "@/components/auth/post-auth-upgrade-resume";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireUser } from "@/lib/auth";
import { ensureProfile, getTripsForUser } from "@/lib/data";
import { isAnonymousUser } from "@/lib/user-state";

export default async function DashboardPage() {
  const { user } = await requireUser();
  await ensureProfile(user);
  const trips = await getTripsForUser(user.id);
  const isGuest = isAnonymousUser(user);

  return (
    <main className="app-shell page-frame">
      <PostAuthUpgradeResume />
      <EventOnView eventName="dashboard_viewed" metadata={{ tripCount: trips.length, isAnonymous: isGuest }} />
      <div className="mx-auto max-w-6xl">
        <header className="playful-card flex flex-col gap-6 rounded-[2rem] p-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">{isGuest ? "Guest dashboard" : "Dashboard"}</p>
            <h1 className="panel-title mt-2 text-3xl font-semibold sm:text-4xl">Your color hunts</h1>
            <p className="body-copy mt-3 max-w-2xl text-base">
              {isGuest
                ? "Start fast, finish the nine-frame challenge, and attach Google or Apple once the poster feels worth keeping."
                : "Keep the loop tight: choose a place, finish the nine-frame challenge, and shape the result into a poster."}
            </p>
            {isGuest ? (
              <p className="mt-4 inline-flex rounded-full border border-[rgba(47,97,223,0.14)] bg-[rgba(47,97,223,0.08)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(47,97,223,0.86)]">
                Guest session · Save with Google or Apple from the poster page
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

        <section className="mt-8">
          {trips.length === 0 ? (
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
          ) : (
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
          )}
        </section>
      </div>
    </main>
  );
}
