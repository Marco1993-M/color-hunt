import Link from "next/link";
import { getPhotoUrl } from "@/lib/data";
import { buildPosterFrameSlots } from "@/lib/poster";
import type { GroupHuntParticipantResult } from "@/lib/types";

type GroupHuntResultsBoardProps = {
  hostUserId: string;
  participants: GroupHuntParticipantResult[];
  heading?: string;
  description?: string;
  variant?: "default" | "public";
};

export function GroupHuntResultsBoard({
  hostUserId,
  participants,
  heading = "The finished recap board.",
  description = "Everyone's nine frames are in. This is the shared payoff moment: compare each color story side by side and see how the same place changed from person to person.",
  variant = "default",
}: GroupHuntResultsBoardProps) {
  const completedParticipants = participants.filter((participant) => {
    const maxPhotos = participant.max_photos ?? 9;
    return Boolean(participant.user_id) && (participant.photo_count ?? 0) >= maxPhotos;
  });
  const publicPosterCount = completedParticipants.filter((participant) => participant.trip?.is_public && participant.trip?.share_id).length;
  const totalFrames = completedParticipants.reduce((count, participant) => count + (participant.photo_count ?? 0), 0);

  if (completedParticipants.length === 0) {
    return null;
  }

  const isPublicVariant = variant === "public";

  return (
    <section
      className={`mt-8 rounded-[1.6rem] border p-4 sm:p-5 ${
        isPublicVariant
          ? "border-[rgba(47,97,223,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(255,249,243,0.8))] shadow-[0_22px_60px_rgba(55,74,102,0.08)]"
          : "border-[rgba(53,37,30,0.08)] bg-white/70"
      }`}
    >
      <p className="eyebrow">Group Results</p>
      <h2 className="panel-title mt-2 text-2xl font-semibold">{heading}</h2>
      <p className="body-copy mt-2 max-w-3xl text-sm sm:text-base">
        {description}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.25rem] border border-[rgba(53,37,30,0.08)] bg-[rgba(255,255,255,0.82)] px-4 py-3">
          <p className="eyebrow">Completed stories</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">{completedParticipants.length}</p>
        </div>
        <div className="rounded-[1.25rem] border border-[rgba(53,37,30,0.08)] bg-[rgba(255,255,255,0.82)] px-4 py-3">
          <p className="eyebrow">Published posters</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">{publicPosterCount}</p>
        </div>
        <div className="rounded-[1.25rem] border border-[rgba(53,37,30,0.08)] bg-[rgba(255,255,255,0.82)] px-4 py-3">
          <p className="eyebrow">Frames collected</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">{totalFrames}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {completedParticipants.map((participant) => {
          const posterSlots = buildPosterFrameSlots(participant.photos ?? []);
          const participantLabel = participant.user_id === hostUserId ? "Host" : `Player ${participant.seat_index + 1}`;
          const publicPosterHref =
            participant.trip?.is_public && participant.trip?.share_id ? `/poster/${participant.trip.share_id}` : null;

          return (
            <article
              key={participant.id}
              className={`rounded-[1.5rem] border p-4 shadow-[0_12px_30px_rgba(53,37,30,0.05)] ${
                isPublicVariant
                  ? "border-[rgba(47,97,223,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,245,239,0.9))]"
                  : "border-[rgba(53,37,30,0.08)] bg-[rgba(255,255,255,0.9)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="eyebrow">{participantLabel}</p>
                    <span className="rounded-full border border-[rgba(53,37,30,0.08)] bg-[rgba(247,245,239,0.92)] px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted-strong)]">
                      Completed
                    </span>
                  </div>
                  <h3 className="mt-2 text-xl font-semibold text-[var(--ink)]">{participant.assigned_color_name} story</h3>
                  <p className="body-copy mt-2 text-sm text-[var(--muted)]">{participant.assigned_prompt}</p>
                </div>
                <span
                  aria-hidden="true"
                  className="mt-1 h-5 w-5 border border-[rgba(53,37,30,0.1)] shadow-[0_6px_14px_rgba(53,37,30,0.08)]"
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
