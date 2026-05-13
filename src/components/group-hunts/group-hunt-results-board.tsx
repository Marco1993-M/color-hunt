import Link from "next/link";
import { getPhotoUrl } from "@/lib/data";
import { buildPosterFrameSlots } from "@/lib/poster";
import type { GroupHuntParticipantResult } from "@/lib/types";

type GroupHuntResultsBoardProps = {
  hostUserId: string;
  participants: GroupHuntParticipantResult[];
};

export function GroupHuntResultsBoard({ hostUserId, participants }: GroupHuntResultsBoardProps) {
  const completedParticipants = participants.filter((participant) => {
    const maxPhotos = participant.max_photos ?? 9;
    return Boolean(participant.user_id) && (participant.photo_count ?? 0) >= maxPhotos;
  });

  if (completedParticipants.length === 0) {
    return null;
  }

  return (
    <section className="mt-8 rounded-[1.6rem] border border-[rgba(53,37,30,0.08)] bg-white/70 p-4 sm:p-5">
      <p className="eyebrow">Group Results</p>
      <h2 className="panel-title mt-2 text-2xl font-semibold">The finished recap board.</h2>
      <p className="body-copy mt-2 max-w-3xl text-sm sm:text-base">
        Everyone&apos;s nine frames are in. This is the shared payoff moment: compare each color story side by side and see how the same place changed from person to person.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {completedParticipants.map((participant) => {
          const posterSlots = buildPosterFrameSlots(participant.photos ?? []);
          const participantLabel = participant.user_id === hostUserId ? "Host" : `Player ${participant.seat_index + 1}`;
          const publicPosterHref =
            participant.trip?.is_public && participant.trip?.share_id ? `/poster/${participant.trip.share_id}` : null;

          return (
            <article
              key={participant.id}
              className="rounded-[1.5rem] border border-[rgba(53,37,30,0.08)] bg-[rgba(255,255,255,0.9)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">{participantLabel}</p>
                  <h3 className="mt-2 text-xl font-semibold text-[var(--ink)]">{participant.assigned_color_name}</h3>
                </div>
                <span
                  aria-hidden="true"
                  className="mt-1 h-5 w-5 border border-[rgba(53,37,30,0.1)]"
                  style={{ backgroundColor: participant.assigned_color_hex }}
                />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-1.5">
                {posterSlots.map((photo, index) => (
                  <div
                    key={photo?.id ?? `${participant.id}-slot-${index}`}
                    className="aspect-square overflow-hidden border border-[rgba(53,37,30,0.06)] bg-[rgba(247,245,239,0.92)]"
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getPhotoUrl(photo)}
                        alt={photo.caption || `${participant.assigned_color_name} frame ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="body-copy text-sm text-[var(--muted)]">
                  {(participant.photo_count ?? 0)}/{participant.max_photos ?? 9} frames complete
                </p>
                {publicPosterHref ? (
                  <Link href={publicPosterHref} className="button-secondary w-full sm:w-auto">
                    View public poster
                  </Link>
                ) : (
                  <p className="body-copy text-sm text-[var(--muted)]">Poster stays private until it&apos;s published.</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
