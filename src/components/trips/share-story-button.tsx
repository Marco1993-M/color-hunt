"use client";

import { useMemo, useState } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { trackEvent } from "@/lib/analytics";

type ShareStoryButtonProps = {
  shareId: string;
  locationLabel: string;
};

function parseFileName(response: Response, fallback: string) {
  const disposition = response.headers.get("content-disposition");
  const match = disposition?.match(/filename="([^"]+)"/);
  return match?.[1] ?? fallback;
}

export function ShareStoryButton({ shareId, locationLabel }: ShareStoryButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sharePageUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return `/poster/${shareId}`;
    }

    return `${window.location.origin}/poster/${shareId}`;
  }, [shareId]);

  async function handleShare() {
    setIsPending(true);
    setMessage(null);
    setError(null);

    try {
      if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
        throw new Error("Sharing isn't supported on this browser yet.");
      }

      const response = await fetch(`/poster/${shareId}/download?format=story`);

      if (!response.ok) {
        throw new Error("Couldn't prepare the story export.");
      }

      const blob = await response.blob();
      const file = new File([blob], parseFileName(response, "color-hunt-story.png"), {
        type: blob.type || "image/png",
      });

      const shareData = {
        title: `Color Hunt · ${locationLabel}`,
        text: `One place. One color. Nine moments. ${locationLabel}`,
        files: [file],
      };

      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share(shareData);
        trackEvent({
          eventName: "public_poster_shared_native",
          shareId,
          metadata: {
            exportFormat: "story",
            mode: "file",
          },
        });
        setMessage("Story ready to share.");
        return;
      }

      await navigator.share({
        title: `Color Hunt · ${locationLabel}`,
        text: `One place. One color. Nine moments.`,
        url: sharePageUrl,
      });
      trackEvent({
        eventName: "public_poster_shared_native",
        shareId,
        metadata: {
          exportFormat: "story",
          mode: "url",
        },
      });
      setMessage("Share sheet opened.");
    } catch (shareFailure) {
      const nextError = shareFailure instanceof Error ? shareFailure.message : "Couldn't open the share sheet.";
      trackEvent({
        eventName: "public_poster_share_failed",
        shareId,
        metadata: {
          exportFormat: "story",
          message: nextError,
        },
      });
      setError(nextError);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        className="rounded-full border border-[rgba(53,37,30,0.1)] bg-white/70 px-3 py-2 text-left text-xs text-[var(--foreground)] transition hover:border-[rgba(53,37,30,0.22)] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
        disabled={isPending}
      >
        <span className="block font-semibold uppercase tracking-[0.12em]">{isPending ? "Preparing..." : "Share Story"}</span>
        <span className="block text-[0.72rem] normal-case tracking-normal opacity-80">Use your phone’s share sheet</span>
      </button>
      {message ? <FeedbackToast kind="success" message={message} onDismiss={() => setMessage(null)} /> : null}
      {error ? <FeedbackToast kind="error" message={error} onDismiss={() => setError(null)} /> : null}
    </>
  );
}
