import Link from "next/link";
import { notFound } from "next/navigation";
import { GroupHuntParticipantList } from "@/components/group-hunts/group-hunt-participant-list";
import { getGroupHuntById, getTripForParticipant } from "@/lib/data";
import { requireUser } from "@/lib/auth";

type GroupHuntPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function GroupHuntPage({ params }: GroupHuntPageProps) {
  const { user } = await requireUser();
  const { id } = await params;
  const bundle = await getGroupHuntById(id, user.id);

  if (!bundle) {
    notFound();
  }

  const hostParticipant = bundle.participants.find((participant) => participant.user_id === user.id) ?? null;
  const hostTrip = hostParticipant ? await getTripForParticipant(hostParticipant.id, user.id) : null;

  return (
    <main className="app-shell page-frame">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-[var(--muted)]">
            ← Back to dashboard
          </Link>
        </div>

        <div className="playful-card rounded-[2.5rem] p-6 sm:p-8">
          <p className="eyebrow">Group Hunt</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="panel-title text-3xl font-semibold sm:text-4xl">{bundle.hunt.title}</h1>
              <p className="body-copy mt-3 max-w-2xl text-base">
                {bundle.hunt.location}
                {bundle.hunt.start_date || bundle.hunt.end_date
                  ? ` · ${bundle.hunt.start_date || "No start date"}${bundle.hunt.end_date ? ` to ${bundle.hunt.end_date}` : ""}`
                  : ""}
              </p>
              <p className="body-copy mt-3 max-w-2xl text-sm sm:text-base">
                Everyone joins the same hunt context, but each person gets their own assigned color and their own poster outcome.
              </p>
            </div>

            {hostTrip ? (
              <Link className="button-primary w-full sm:w-auto" href={`/trips/${hostTrip.id}`}>
                Open my hunt
              </Link>
            ) : null}
          </div>

          <div className="mt-8 rounded-[1.6rem] border border-[rgba(47,97,223,0.12)] bg-[rgba(255,255,255,0.58)] p-4 sm:p-5">
            <p className="eyebrow">Invite your group</p>
            <h2 className="panel-title mt-2 text-2xl font-semibold">Send each person to their own assigned color.</h2>
            <p className="body-copy mt-2 max-w-2xl text-sm sm:text-base">
              These invite links all point to the same shared hunt, but each seat carries its own color mission.
            </p>
            <GroupHuntParticipantList groupHuntId={bundle.hunt.id} participants={bundle.participants} />
          </div>
        </div>
      </div>
    </main>
  );
}
