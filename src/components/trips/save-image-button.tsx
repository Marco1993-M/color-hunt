"use client";

import { useState } from "react";
import { toBlob } from "html-to-image";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { trackEvent } from "@/lib/analytics";

type SaveImageButtonProps = {
  fileUrl?: string | null;
  captureTargetId?: string;
  fileName?: string;
  tripId?: string;
  shareId?: string | null;
  buttonLabel?: string;
  className?: string;
};

export function SaveImageButton({
  fileUrl,
  captureTargetId,
  fileName = "color-hunt-poster.png",
  tripId,
  shareId = null,
  buttonLabel = "Save image",
  className = "button-primary w-full sm:w-auto",
}: SaveImageButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openBlob(blob: Blob) {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    link.rel = "noreferrer";
    link.click();

    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 2000);
  }

  async function shareOrDownloadBlob(blob: Blob) {
    const shareFile = new File([blob], fileName, {
      type: blob.type || "image/png",
    });

    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [shareFile] })
    ) {
      await navigator.share({
        title: "Color Hunt poster",
        files: [shareFile],
      });
      return "shared";
    }

    await openBlob(blob);
    return "downloaded";
  }

  async function handleOpenImage() {
    setError(null);
    setIsPending(true);

    try {
      trackEvent({
        eventName: "poster_image_opened",
        tripId,
        shareId,
      });

      if (captureTargetId) {
        const target = document.getElementById(captureTargetId);

        if (target) {
          const blob = await toBlob(target, {
            cacheBust: true,
            pixelRatio: 2,
            backgroundColor: "#faf6ef",
          });

          if (!blob) {
            throw new Error("Couldn't prepare the poster image.");
          }

          const mode = await shareOrDownloadBlob(blob);
          trackEvent({
            eventName: mode === "shared" ? "poster_image_shared_native" : "poster_image_downloaded",
            tripId,
            shareId,
            metadata: {
              mode: "captured_dom",
            },
          });
          return;
        }
      }

      if (!fileUrl) {
        setError("Your poster image is still being prepared.");
        return;
      }

      const response = await fetch(fileUrl);

      if (!response.ok) {
        throw new Error("Couldn't fetch the poster image.");
      }

      const blob = await response.blob();
      const mode = await shareOrDownloadBlob(blob);
      trackEvent({
        eventName: mode === "shared" ? "poster_image_shared_native" : "poster_image_downloaded",
        tripId,
        shareId,
        metadata: {
          mode: "cached_file",
        },
      });
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
        {isPending ? "Preparing image..." : captureTargetId || fileUrl ? buttonLabel : "Preparing poster..."}
      </button>
      <p className="mt-2 text-xs text-[var(--muted)]">
        {!captureTargetId && !fileUrl
          ? "The main poster asset is still being prepared. Try again in a moment."
          : isPending
          ? "Preparing the poster image for your phone’s share and save options."
          : "Open your phone’s native save and share options for the poster."}
      </p>
      {error ? <FeedbackToast kind="error" message={error} onDismiss={() => setError(null)} /> : null}
    </>
  );
}
