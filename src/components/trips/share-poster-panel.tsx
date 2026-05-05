"use client";

import { useMemo, useState, useTransition } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { trackEvent } from "@/lib/analytics";
import { getRetentionSummaryLabel } from "@/lib/retention";
import { createClient } from "@/lib/supabase/client";

type SharePosterPanelProps = {
  tripId: string;
  initialShareId: string | null;
  initialIsPublic: boolean;
  schemaReady: boolean;
  currentPhotoCount: number;
  maxPhotos: number;
};

type SupabaseErrorLike = {
  code?: string;
  message?: string;
};

function isMissingShareSchema(error: SupabaseErrorLike | null | undefined) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

export function SharePosterPanel({
  tripId,
  initialShareId,
  initialIsPublic,
  schemaReady,
  currentPhotoCount,
  maxPhotos,
}: SharePosterPanelProps) {
  const [shareId, setShareId] = useState(initialShareId);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isComplete = currentPhotoCount >= maxPhotos;
  const retentionSummary = getRetentionSummaryLabel({
    isPublic,
    photoCount: currentPhotoCount,
    maxPhotos,
  });

  const shareUrl = useMemo(() => {
    if (!shareId) {
      return null;
    }

    if (typeof window === "undefined") {
      return `/poster/${shareId}`;
    }

    return `${window.location.origin}/poster/${shareId}`;
  }, [shareId]);

  function handleToggle(nextValue: boolean) {
    setError(null);
    setMessage(null);

    if (nextValue && !isComplete) {
      trackEvent({
        eventName: "poster_publish_blocked_incomplete",
        tripId,
        metadata: {
          currentPhotoCount,
          maxPhotos,
        },
      });
      setError(`Finish all ${maxPhotos} frames before publishing the poster.`);
      return;
    }

    startTransition(async () => {
      try {
        const nextShareId = shareId ?? crypto.randomUUID();
        const supabase = createClient();
        const result = await supabase
          .from("trips")
          .update({
            is_public: nextValue,
            share_id: nextShareId,
          })
          .eq("id", tripId)
          .select("share_id, is_public")
          .single();

        const updateError = result.error as SupabaseErrorLike | null;

        if (isMissingShareSchema(updateError)) {
          throw new Error("Sharing needs the latest Supabase SQL before it can be turned on.");
        }

        if (updateError) {
          throw updateError;
        }

        setShareId(result.data?.share_id ?? nextShareId);
        setIsPublic(result.data?.is_public ?? nextValue);
        trackEvent({
          eventName: nextValue ? "poster_published" : "poster_unpublished",
          tripId,
          shareId: result.data?.share_id ?? nextShareId,
          metadata: {
            currentPhotoCount,
            maxPhotos,
          },
        });
        setMessage(nextValue ? "Poster link is live." : "Public sharing is now turned off.");
      } catch (failure) {
        trackEvent({
          eventName: nextValue ? "poster_publish_failed" : "poster_unpublish_failed",
          tripId,
          shareId,
          metadata: {
            message: failure instanceof Error ? failure.message : "unknown_failure",
          },
        });
        setError(failure instanceof Error ? failure.message : "Unable to update sharing right now.");
      }
    });
  }

  async function handleCopyLink() {
    if (!shareUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      trackEvent({
        eventName: "share_link_copied",
        tripId,
        shareId,
      });
      setError(null);
      setMessage("Share link copied.");
    } catch {
      trackEvent({
        eventName: "share_link_copy_failed",
        tripId,
        shareId,
      });
      setError("Could not copy the share link automatically.");
    }
  }

  return (
    <div className="glass-panel rounded-[1.8rem] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Share Poster</p>
          <h3 className="panel-title mt-2 text-2xl font-semibold">Give this Color Hunt poster a public URL.</h3>
          <p className="body-copy mt-3 max-w-2xl text-sm sm:text-base">
            Turn sharing on when the grid feels ready. The public page keeps the focus on the finished poster, not the private trip tools.
          </p>
        </div>
        <button
          className={`${isPublic ? "button-secondary" : "button-primary"} w-full sm:w-auto`}
          type="button"
          onClick={() => handleToggle(!isPublic)}
          disabled={isPending || !schemaReady}
        >
          {isPending ? "Saving..." : isPublic ? "Turn sharing off" : "Publish poster"}
        </button>
      </div>

      {!isComplete ? (
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          Finish all {maxPhotos} frames before publishing. The public page and downloads are reserved for completed posters.
        </p>
      ) : null}

      {!schemaReady ? (
        <p className="mt-4 text-sm leading-7 text-[#a0611d]">
          Sharing is ready in the app, but your database still needs the latest `supabase/schema.sql` updates first.
        </p>
      ) : null}

      {isPublic && shareUrl ? (
        <div className="mt-5 rounded-[1.4rem] border border-[rgba(53,37,30,0.1)] bg-[rgba(255,255,255,0.55)] p-4">
          <p className="eyebrow">Public Link</p>
          <p className="body-copy mt-2 break-all text-sm">{shareUrl}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button className="button-primary w-full sm:w-auto" type="button" onClick={handleCopyLink}>
              Copy link
            </button>
            <a
              className="button-secondary w-full sm:w-auto"
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() =>
                trackEvent({
                  eventName: "share_link_opened_from_dashboard",
                  tripId,
                  shareId,
                })
              }
            >
              Open public page
            </a>
          </div>
        </div>
      ) : null}

      <p className="body-copy mt-4 text-xs sm:text-sm">
        Storage note: raw trip photos are temporary working files. Right now, {retentionSummary}.
      </p>

      {message ? <FeedbackToast kind="success" message={message} onDismiss={() => setMessage(null)} /> : null}
      {error ? <FeedbackToast kind="error" message={error} onDismiss={() => setError(null)} /> : null}
    </div>
  );
}
