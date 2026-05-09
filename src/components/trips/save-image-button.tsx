"use client";

import { useState } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { trackEvent } from "@/lib/analytics";

type SaveImageButtonProps = {
  fileUrl: string;
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
    setError(null);
    setIsPending(true);

    try {
      const response = await fetch(fileUrl, { cache: "no-store" });

      if (!response.ok) {
        throw new Error("Couldn't open the poster image.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      trackEvent({
        eventName: "poster_image_opened",
        tripId,
        shareId,
      });

      window.open(objectUrl, "_blank", "noopener,noreferrer");

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 60_000);
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
      setIsPending(false);
    }
  }

  return (
    <>
      <button type="button" onClick={handleOpenImage} className={className} disabled={isPending}>
        {isPending ? "Preparing image..." : buttonLabel}
      </button>
      <p className="mt-2 text-xs text-[var(--muted)]">
        {isPending
          ? "Opening the poster image so you can save it directly."
          : "Open the actual poster image in a new tab so you can save it directly."}
      </p>
      {error ? <FeedbackToast kind="error" message={error} onDismiss={() => setError(null)} /> : null}
    </>
  );
}
