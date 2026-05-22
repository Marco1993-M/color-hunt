import Link from "next/link";
import { redirect } from "next/navigation";
import { joinGroupHuntAction } from "@/app/actions";
import { AnalyticsHiddenFields } from "@/components/analytics/analytics-hidden-fields";
import { AuthPanel } from "@/components/auth/auth-panel";
import { getGroupParticipantByInviteToken, getTripForParticipant } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { isAnonymousUser } from "@/lib/user-state";

type JoinGroupHuntPageProps = {
  params: Promise<{
    inviteToken: string;
  }>;
};

export default async function JoinGroupHuntPage({ params }: JoinGroupHuntPageProps) {
  const { inviteToken } = await params;
  const inviteSeat = await getGroupParticipantByInviteToken(inviteToken);

  if (!inviteSeat) {
    return (
      <main className="app-shell page-frame">
        <div className="mx-auto max-w-3xl">
          <div className="playful-card rounded-[2.5rem] p-6 sm:p-8">
            <p className="eyebrow">Invite unavailable</p>
            <h1 className="panel-title mt-3 text-3xl font-semibold sm:text-4xl">This group invite could not be found.</h1>
            <p className="body-copy mt-3 max-w-2xl text-base">
              It may have expired, been copied incorrectly, or belonged to a hunt that has already been closed.
            </p>
            <Link href="/" className="button-primary mt-6 inline-flex">
              Back to Color Hunt
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || isAnonymousUser(user)) {
    return (
      <main className="app-shell page-frame">
        <div className="mx-auto max-w-3xl">
          <AuthPanel
            nextPath={`/join/${inviteToken}`}
            challengeColorName={inviteSeat.participant.assigned_color_name}
            requireSignIn
          />
        </div>
      </main>
    );
  }

  if (inviteSeat.participant.user_id && inviteSeat.participant.user_id !== user.id) {
    return (
      <main className="app-shell page-frame">
        <div className="mx-auto max-w-3xl">
          <div className="playful-card rounded-[2.5rem] p-6 sm:p-8">
            <p className="eyebrow">Invite already used</p>
            <h1 className="panel-title mt-3 text-3xl font-semibold sm:text-4xl">That seat has already been claimed.</h1>
            <p className="body-copy mt-3 max-w-2xl text-base">
              This {inviteSeat.participant.assigned_color_name} invite link has already been used by someone else in the group.
            </p>
            <Link href="/dashboard" className="button-primary mt-6 inline-flex">
              Open dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (inviteSeat.participant.user_id === user.id) {
    const existingTrip = await getTripForParticipant(inviteSeat.participant.id, user.id);

    if (existingTrip) {
      redirect(`/trips/${existingTrip.id}`);
    }
  }

  return (
    <main className="app-shell page-frame">
      <div className="mx-auto max-w-3xl">
        <div className="playful-card rounded-[2.5rem] p-6 sm:p-8">
          <p className="eyebrow">Join Group Hunt</p>
          <h1 className="panel-title mt-3 text-3xl font-semibold sm:text-4xl">{inviteSeat.hunt.title}</h1>
          <p className="body-copy mt-3 max-w-2xl text-base">
            {inviteSeat.hunt.location}
            {inviteSeat.hunt.start_date || inviteSeat.hunt.end_date
              ? ` · ${inviteSeat.hunt.start_date || "No start date"}${inviteSeat.hunt.end_date ? ` to ${inviteSeat.hunt.end_date}` : ""}`
              : ""}
          </p>

          <div className="mt-6 rounded-[1.6rem] border border-[rgba(47,97,223,0.12)] bg-[rgba(255,255,255,0.58)] p-4 sm:p-5">
            <p className="eyebrow">Your assigned color</p>
            <div className="mt-3 flex items-start justify-between gap-4">
              <div>
                <h2 className="panel-title text-2xl font-semibold">{inviteSeat.participant.assigned_color_name}</h2>
                <p className="body-copy mt-2 max-w-xl text-sm sm:text-base">{inviteSeat.participant.assigned_prompt}</p>
              </div>
              <span
                aria-hidden="true"
                className="mt-1 h-5 w-5 border border-[rgba(53,37,30,0.1)]"
                style={{ backgroundColor: inviteSeat.participant.assigned_color_hex }}
              />
            </div>
          </div>

          <p className="body-copy mt-6 max-w-2xl text-sm sm:text-base">
            Once you join, this color becomes your own nine-frame hunt inside the shared group challenge.
          </p>

          <form action={joinGroupHuntAction} className="mt-6">
            <AnalyticsHiddenFields />
            <input type="hidden" name="invite_token" value={inviteToken} />
            <button className="button-primary w-full sm:w-auto" type="submit">
              Join this hunt
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
