"use client";

import { useMemo, useState } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { trackEvent } from "@/lib/analytics";

type ShareLinkButtonProps = {
  shareId?: string | null;
  tripId?: string;
  url: string;
  title: string;
  text: string;
  buttonLabel?: string;
  buttonDescription?: string;
  eventName?: string;
  metadata?: Record<string, unknown>;
  className?: string;
};

export function ShareLinkButton({
  shareId = null,
  tripId,
  url,
  title,
  text,
  buttonLabel = "Share poster",
  buttonDescription = "Open your phone’s share sheet",
  eventName = "poster_link_shared_native",
  metadata = {},
  className = "button-primary w-full sm:w-auto",
}: ShareLinkButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fallbackLabel = useMemo(() => (buttonDescription ? buttonDescription : null), [buttonDescription]);

  async function handleShare() {
    setIsPending(true);
    setError(null);
    setMessage(null);

    try {
      if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
        await navigator.clipboard.writeText(url);
        trackEvent({
          eventName: `${eventName}_copied`,
          tripId,
          shareId,
          metadata,
        });
        setMessage("Share link copied.");
        return;
      }

      await navigator.share({ title, text, url });
      trackEvent({
        eventName,
        tripId,
        shareId,
        metadata,
      });
      setMessage("Share sheet opened.");
    } catch (shareFailure) {
      const nextError = shareFailure instanceof Error ? shareFailure.message : "Couldn't open the share sheet.";
      trackEvent({
        eventName: `${eventName}_failed`,
        tripId,
        shareId,
        metadata: {
          ...metadata,
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
      <button type="button" onClick={handleShare} className={className} disabled={isPending}>
        {isPending ? "Preparing..." : buttonLabel}
      </button>
      {fallbackLabel ? <p className="mt-2 text-xs text-[var(--muted)]">{fallbackLabel}</p> : null}
      {message ? <FeedbackToast kind="success" message={message} onDismiss={() => setMessage(null)} /> : null}
      {error ? <FeedbackToast kind="error" message={error} onDismiss={() => setError(null)} /> : null}
    </>
  );
}
