"use client";

import { useState } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { trackEvent } from "@/lib/analytics";
import { getAppOrigin } from "@/lib/app-url";
import type { GroupHuntParticipant } from "@/lib/types";

type GroupHuntParticipantListProps = {
  groupHuntId: string;
  participants: GroupHuntParticipant[];
};

function getInviteLink(inviteToken: string) {
  const origin = getAppOrigin();
  return origin ? `${origin}/join/${inviteToken}` : `/join/${inviteToken}`;
}

export function GroupHuntParticipantList({ groupHuntId, participants }: GroupHuntParticipantListProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCopyLink(participant: GroupHuntParticipant) {
    try {
      await navigator.clipboard.writeText(getInviteLink(participant.invite_token));
      trackEvent({
        eventName: "group_invite_link_copied",
        metadata: {
          groupHuntId,
          participantId: participant.id,
          seatIndex: participant.seat_index + 1,
          assignedColorName: participant.assigned_color_name,
        },
      });
      setError(null);
      setMessage(`${participant.assigned_color_name} invite link is copied.`);
    } catch {
      setMessage(null);
      setError("Could not copy that invite link automatically.");
    }
  }

  async function handleCopyAll() {
    try {
      const value = participants
        .map((participant) => {
          return `Player ${participant.seat_index + 1} · ${participant.assigned_color_name}\n${getInviteLink(participant.invite_token)}`;
        })
        .join("\n\n");
      await navigator.clipboard.writeText(value);
      trackEvent({
        eventName: "group_invite_links_copied",
        metadata: {
          groupHuntId,
          participantCount: participants.length,
        },
      });
      setError(null);
      setMessage("All invite links are copied.");
    } catch {
      setMessage(null);
      setError("Could not copy all invite links automatically.");
    }
  }

  return (
    <>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button className="button-secondary w-full sm:w-auto" type="button" onClick={handleCopyAll}>
          Copy all invite links
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className="rounded-[1.25rem] border border-[rgba(53,37,30,0.08)] bg-white/70 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Player {participant.seat_index + 1}</p>
                <h3 className="mt-2 text-lg font-semibold text-[var(--ink)]">{participant.assigned_color_name}</h3>
              </div>
              <span
                aria-hidden="true"
                className="h-4 w-4 border border-[rgba(53,37,30,0.1)]"
                style={{ backgroundColor: participant.assigned_color_hex }}
              />
            </div>

            <p className="body-copy mt-3 text-sm">{participant.assigned_prompt}</p>
            <p className="body-copy mt-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              {participant.status === "joined"
                ? "Joined"
                : participant.status === "started"
                  ? "Started"
                  : participant.status === "completed"
                    ? "Completed"
                    : "Waiting for join"}
            </p>

            <button className="button-secondary mt-4 w-full" type="button" onClick={() => handleCopyLink(participant)}>
              Copy invite link
            </button>
          </div>
        ))}
      </div>

      {message ? <FeedbackToast kind="success" message={message} onDismiss={() => setMessage(null)} /> : null}
      {error ? <FeedbackToast kind="error" message={error} onDismiss={() => setError(null)} /> : null}
    </>
  );
}
