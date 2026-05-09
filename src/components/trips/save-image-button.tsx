"use client";

import { useState } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { trackEvent } from "@/lib/analytics";

type SaveImageButtonProps = {
  fileUrl?: string | null;
  tripId?: string;
  shareId?: string | null;
  buttonLabel?: string;
  className?: string;
};

export function SaveImageButton({
  fileUrl,
  tripId,
  shareId = null,
  buttonLabel = "Save image",
  className = "button-primary w-full sm:w-auto",
}: SaveImageButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpenImage() {
    if (!fileUrl) {
      setError("Your poster image is still being prepared.");
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      trackEvent({
        eventName: "poster_image_opened",
        tripId,
        shareId,
      });

      const link = document.createElement("a");
      link.href = fileUrl;
      link.rel = "noreferrer";
      link.click();
    } catch (openFailure) {
      const message = openFailure instanceof Error ? openFailure.message : "Couldn't open the poster image.";
      trackEvent({
        eventName: "poster_image_open_failed",
        tripId,
        shareId,
        metadata: {
          message,
        },
      });
      setError(message);
    } finally {
      window.setTimeout(() => {
        setIsPending(false);
      }, 350);
    }
  }

  return (
    <>
      <button type="button" onClick={handleOpenImage} className={className} disabled={isPending}>
        {isPending ? "Preparing image..." : fileUrl ? buttonLabel : "Preparing poster..."}
      </button>
      <p className="mt-2 text-xs text-[var(--muted)]">
        {!fileUrl
          ? "The main poster asset is still being prepared. Try again in a moment."
          : isPending
          ? "Opening the poster image so you can save it directly."
          : "Open the actual poster image directly so you can save it."}
      </p>
      {error ? <FeedbackToast kind="error" message={error} onDismiss={() => setError(null)} /> : null}
    </>
  );
}
