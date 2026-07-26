import Link from "next/link";
import { EventOnView } from "@/components/analytics/event-on-view";
import { PostAuthUpgradeResume } from "@/components/auth/post-auth-upgrade-resume";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireUser } from "@/lib/auth";
import { getCoverTemplate, inferCoverTemplateId, isCoverTripLike } from "@/lib/covers";
import { ensureProfile, getGroupHuntsForUser, getTripDashboardSummaries, type DashboardTripSummary } from "@/lib/data";
import { isAnonymousUser } from "@/lib/user-state";

type ContinueDestination =
  | { kind: "trip"; summary: DashboardTripSummary }
  | {
      kind: "hosted-group";
      hunt: Awaited<ReturnType<typeof getGroupHuntsForUser>>["hosted"][number];
    }
  | {
      kind: "joined-group";
      hunt: Awaited<ReturnType<typeof getGroupHuntsForUser>>["joined"][number]["hunt"];
      participant: Awaited<ReturnType<typeof getGroupHuntsForUser>>["joined"][number]["participant"];
      tripId: Awaited<ReturnType<typeof getGroupHuntsForUser>>["joined"][number]["tripId"];
    };

function getTripHref(summary: DashboardTripSummary) {
  if (isCoverSummary(summary)) {
    const templateId = inferCoverTemplateId({ trip: summary.trip, mission: summary.mission });
    return `/covers/${templateId}/new?draft=${summary.trip.id}`;
  }

  return `/trips/new?draft=${summary.trip.id}`;
}

function isCoverSummary(summary: DashboardTripSummary) {
  return isCoverTripLike({ trip: summary.trip, mission: summary.mission });
}

function getTripModeLabel(summary: DashboardTripSummary) {
  if (isCoverSummary(summary)) {
    const templateLabel = getCoverTemplate(inferCoverTemplateId({ trip: summary.trip, mission: summary.mission })).label;

    return `Cover · ${templateLabel}`;
  }

  return summary.mission?.color_name ? `Solo hunt · ${summary.mission.color_name}` : "Solo hunt";
}

function getTripStatusChip(summary: DashboardTripSummary) {
  if (summary.isComplete) {
    return "Ready";
  }

  return isCoverSummary(summary) ? "In progress" : "Continue";
}

function getTripProgressCopy(summary: DashboardTripSummary) {
  if (isCoverSummary(summary)) {
    return summary.isComplete
      ? `${summary.photoCount}/${summary.maxPhotos} photos ready for your cover`
      : `${summary.photoCount}/${summary.maxPhotos} photos placed`;
  }

  return summary.isComplete
    ? `${summary.photoCount}/${summary.maxPhotos} frames ready for your poster`
    : `${summary.photoCount}/${summary.maxPhotos} frames complete`;
}

function getTripActionLabel(summary: DashboardTripSummary) {
  if (summary.isComplete) {
    return isCoverSummary(summary) ? "Open cover" : "Open poster";
  }

  return isCoverSummary(summary) ? "Continue cover" : "Continue hunt";
}

function getProgressPercent(summary: DashboardTripSummary) {
  return Math.max(0, Math.min(100, (summary.photoCount / summary.maxPhotos) * 100));
}

function isVisibleDashboardDraft(summary: DashboardTripSummary) {
  if (summary.photoCount > 0 || summary.isComplete) return true;

  const createdAt = new Date(summary.trip.created_at).getTime();
  const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
  return Number.isNaN(createdAt) || createdAt >= twelveHoursAgo;
}

function getContinueDestination(
  activeTrips: DashboardTripSummary[],
  hostedHunts: Awaited<ReturnType<typeof getGroupHuntsForUser>>["hosted"],
  joinedHunts: Awaited<ReturnType<typeof getGroupHuntsForUser>>["joined"],
): ContinueDestination | null {
  if (activeTrips.length > 0) {
    return { kind: "trip", summary: activeTrips[0] };
  }

  const activeJoined = joinedHunts.find((entry) => entry.participant?.status !== "completed");
  if (activeJoined) {
    return {
      kind: "joined-group",
      hunt: activeJoined.hunt,
      participant: activeJoined.participant,
      tripId: activeJoined.tripId,
    };
  }

  const activeHosted = hostedHunts.find((hunt) => hunt.status === "open" || hunt.status === "active");
  if (activeHosted) {
    return { kind: "hosted-group", hunt: activeHosted };
  }

  return null;
}

export default async function DashboardPage() {
  const { user } = await requireUser();
  await ensureProfile(user);
  const [tripSummaries, groupHunts] = await Promise.all([
    getTripDashboardSummaries(user.id),
    getGroupHuntsForUser(user.id),
  ]);

  const isGuest = isAnonymousUser(user);
  const soloTripSummaries = tripSummaries.filter((summary) => !summary.trip.group_hunt_id && isVisibleDashboardDraft(summary));
  const activeTrips = soloTripSummaries.filter((summary) => !summary.isComplete);
  const pastTrips = soloTripSummaries.filter((summary) => summary.isComplete);
  const hasGroups = groupHunts.hosted.length > 0 || groupHunts.joined.length > 0;
  const continueDestination = getContinueDestination(activeTrips, groupHunts.hosted, groupHunts.joined);
  const isEmpty = soloTripSummaries.length === 0 && !hasGroups;

  return (
    <main className="app-shell page-frame">
      <PostAuthUpgradeResume />
      <EventOnView
        eventName="dashboard_viewed"
        metadata={{
          tripCount: soloTripSummaries.length,
          activeTripCount: activeTrips.length,
          completedTripCount: pastTrips.length,
          hostedGroupHuntCount: groupHunts.hosted.length,
          joinedGroupHuntCount: groupHunts.joined.length,
          isAnonymous: isGuest,
        }}
      />

      <div className="dashboard-shell mx-auto max-w-6xl">
        <header className="dashboard-topbar playful-card rounded-[2rem] p-6 sm:p-7">
          <div className="dashboard-topbar-copy">
            <p className="eyebrow">{isGuest ? "Guest dashboard" : "Your dashboard"}</p>
            <h1 className="panel-title mt-2 text-3xl font-semibold sm:text-[2.5rem]">
              Pick up where you left off.
            </h1>
            <p className="body-copy mt-3 max-w-2xl text-base">
              {isGuest
                ? "Your active hunts, covers, and group moments all stay here while you work toward the final poster."
                : "Keep the next move obvious: continue what’s active, jump into group plans, or open something ready to share."}
            </p>
            {isGuest ? (
              <p className="dashboard-guest-chip mt-4">
                Guest session · Save with Google from the poster page
              </p>
            ) : null}
          </div>

          <div className="dashboard-topbar-actions">
            <Link className="button-primary w-full sm:w-auto" href="/trips/new">
              Start a hunt
            </Link>
            <Link className="button-secondary w-full sm:w-auto" href="/covers/new">
              Choose a template
            </Link>
            <SignOutButton isAnonymous={isGuest} />
          </div>
        </header>

        {continueDestination ? (
          <section className="dashboard-section mt-8">
            <div className="dashboard-section-head">
              <p className="eyebrow">Continue</p>
              <h2 className="panel-title mt-2 text-2xl font-semibold">Your next move is ready</h2>
            </div>

            {continueDestination.kind === "trip" ? (
              <Link
                href={getTripHref(continueDestination.summary)}
                className="dashboard-continue-card playful-card mt-4 rounded-[2rem] p-6 transition-transform duration-150 hover:-translate-y-1 sm:p-7"
              >
                <div className="dashboard-continue-copy">
                  <span className="dashboard-status-chip">{getTripStatusChip(continueDestination.summary)}</span>
                  <p className="dashboard-card-label mt-4">{getTripModeLabel(continueDestination.summary)}</p>
                  <h3 className="panel-title mt-2 text-2xl font-semibold sm:text-[2rem]">
                    {continueDestination.summary.trip.title}
                  </h3>
                  <p className="body-copy mt-3 text-sm">{getTripProgressCopy(continueDestination.summary)}</p>
                  <div className="dashboard-progress mt-5">
                    <div
                      className="dashboard-progress-bar"
                      style={{ width: `${getProgressPercent(continueDestination.summary)}%` }}
                    />
                  </div>
                  <div className="dashboard-card-footer mt-6">
                    <span>{continueDestination.summary.trip.location}</span>
                    <span className="dashboard-inline-action">
                      {getTripActionLabel(continueDestination.summary)}
                      <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </div>
              </Link>
            ) : continueDestination.kind === "joined-group" ? (
              <Link
                href={continueDestination.tripId ? `/trips/${continueDestination.tripId}` : `/group-hunts/${continueDestination.hunt.id}`}
                className="dashboard-continue-card playful-card mt-4 rounded-[2rem] p-6 transition-transform duration-150 hover:-translate-y-1 sm:p-7"
              >
                <div className="dashboard-continue-copy">
                  <span className="dashboard-status-chip">
                    {continueDestination.participant ? `Joined · ${continueDestination.participant.status}` : "Joined"}
                  </span>
                  <p className="dashboard-card-label mt-4">
                    Group hunt · {continueDestination.participant?.assigned_color_name ?? "Your color"}
                  </p>
                  <h3 className="panel-title mt-2 text-2xl font-semibold sm:text-[2rem]">
                    {continueDestination.hunt.title}
                  </h3>
                  <p className="body-copy mt-3 text-sm">
                    Stay in the group loop and keep your assigned color moving toward the final poster.
                  </p>
                  <div className="dashboard-card-footer mt-6">
                    <span>{continueDestination.hunt.location}</span>
                    <span className="dashboard-inline-action">
                      {continueDestination.tripId ? "Continue your part" : "Open the group"}
                      <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </div>
              </Link>
            ) : (
              <Link
                href={`/group-hunts/${continueDestination.hunt.id}`}
                className="dashboard-continue-card playful-card mt-4 rounded-[2rem] p-6 transition-transform duration-150 hover:-translate-y-1 sm:p-7"
              >
                <div className="dashboard-continue-copy">
                  <span className="dashboard-status-chip">Hosting · {continueDestination.hunt.status}</span>
                  <p className="dashboard-card-label mt-4">Group hunt · {continueDestination.hunt.group_size} people</p>
                  <h3 className="panel-title mt-2 text-2xl font-semibold sm:text-[2rem]">
                    {continueDestination.hunt.title}
                  </h3>
                  <p className="body-copy mt-3 text-sm">
                    Check the seats, see who has joined, and keep the group momentum moving.
                  </p>
                  <div className="dashboard-card-footer mt-6">
                    <span>{continueDestination.hunt.location}</span>
                    <span className="dashboard-inline-action">
                      Open group hunt
                      <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </div>
              </Link>
            )}
          </section>
        ) : null}

        {activeTrips.length > 0 ? (
          <section className="dashboard-section mt-8">
            <div className="dashboard-section-head">
              <p className="eyebrow">Active</p>
              <h2 className="panel-title mt-2 text-2xl font-semibold">In progress</h2>
            </div>
            <div className="dashboard-scroll-row mt-4">
              {activeTrips.map((summary) => (
                <Link
                  key={summary.trip.id}
                  href={getTripHref(summary)}
                  className="dashboard-card playful-card rounded-[1.75rem] p-5 transition-transform duration-150 hover:-translate-y-1"
                >
                  <span className="dashboard-status-chip">{getTripStatusChip(summary)}</span>
                  <p className="dashboard-card-label mt-4">{getTripModeLabel(summary)}</p>
                  <h3 className="panel-title mt-2 text-xl font-semibold">{summary.trip.title}</h3>
                  <p className="body-copy mt-3 text-sm">{getTripProgressCopy(summary)}</p>
                  <div className="dashboard-progress mt-5">
                    <div className="dashboard-progress-bar" style={{ width: `${getProgressPercent(summary)}%` }} />
                  </div>
                  <div className="dashboard-card-footer mt-5">
                    <span>{summary.trip.location}</span>
                    <span className="dashboard-inline-action">
                      {getTripActionLabel(summary)}
                      <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {hasGroups ? (
          <section className="dashboard-section mt-8">
            <div className="dashboard-section-head">
              <p className="eyebrow">Groups</p>
              <h2 className="panel-title mt-2 text-2xl font-semibold">Shared plans and active circles</h2>
            </div>
            <div className="dashboard-scroll-row mt-4">
              {groupHunts.hosted.map((hunt) => (
                <Link
                  key={`hosted-${hunt.id}`}
                  href={`/group-hunts/${hunt.id}`}
                  className="dashboard-card playful-card rounded-[1.75rem] p-5 transition-transform duration-150 hover:-translate-y-1"
                >
                  <span className="dashboard-status-chip">Hosting</span>
                  <p className="dashboard-card-label mt-4">Group hunt · {hunt.group_size} people</p>
                  <h3 className="panel-title mt-2 text-xl font-semibold">{hunt.title}</h3>
                  <p className="body-copy mt-3 text-sm">
                    {hunt.location} · {hunt.status}
                  </p>
                  <div className="dashboard-card-footer mt-5">
                    <span>Manage the group</span>
                    <span className="dashboard-inline-action">
                      Open
                      <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </Link>
              ))}

              {groupHunts.joined.map(({ hunt, participant, tripId }) => (
                <Link
                  key={`joined-${hunt.id}`}
                  href={tripId ? `/trips/${tripId}` : `/group-hunts/${hunt.id}`}
                  className="dashboard-card playful-card rounded-[1.75rem] p-5 transition-transform duration-150 hover:-translate-y-1"
                >
                  <span className="dashboard-status-chip">Joined</span>
                  <p className="dashboard-card-label mt-4">
                    {participant ? `${participant.assigned_color_name} · ${participant.status}` : "Shared hunt"}
                  </p>
                  <h3 className="panel-title mt-2 text-xl font-semibold">{hunt.title}</h3>
                  <p className="body-copy mt-3 text-sm">{hunt.location}</p>
                  <div className="dashboard-card-footer mt-5">
                    <span>{tripId ? "Your part is active" : "Waiting for your trip"}</span>
                    <span className="dashboard-inline-action">
                      Open
                      <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {pastTrips.length > 0 ? (
          <section className="dashboard-section mt-8">
            <div className="dashboard-section-head">
              <p className="eyebrow">Past</p>
              <h2 className="panel-title mt-2 text-2xl font-semibold">Ready to revisit</h2>
            </div>
            <div className="dashboard-archive-grid mt-4">
              {pastTrips.map((summary) => (
                <Link
                  key={summary.trip.id}
                  href={getTripHref(summary)}
                  className="dashboard-archive-card rounded-[1.5rem] p-5 transition-transform duration-150 hover:-translate-y-1"
                >
                  <div className="dashboard-archive-head">
                    <span className="dashboard-status-chip">Ready</span>
                    <span className="dashboard-archive-type">{getTripModeLabel(summary)}</span>
                  </div>
                  <h3 className="panel-title mt-4 text-lg font-semibold">{summary.trip.title}</h3>
                  <p className="body-copy mt-2 text-sm">{summary.trip.location}</p>
                  <div className="dashboard-card-footer mt-5">
                    <span>{getTripProgressCopy(summary)}</span>
                    <span className="dashboard-inline-action">
                      {getTripActionLabel(summary)}
                      <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {isEmpty ? (
          <section className="mt-8">
            <div className="empty-state-card rounded-[2rem] p-10 text-center">
              <p className="eyebrow">Nothing started yet</p>
              <h2 className="panel-title mt-3 text-2xl font-semibold">Begin with a hunt or jump straight into a template.</h2>
              <p className="body-copy mt-3 text-base">
                Choose the route that feels most familiar: collect nine moments around one color, or turn four photos into a styled cover.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link className="button-primary" href="/trips/new">
                  Start a Color Hunt
                </Link>
                <Link className="button-secondary" href="/covers/custom-title/new">
                  Choose a template
                </Link>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
