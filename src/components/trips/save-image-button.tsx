"use client";

import { useState } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { trackEvent } from "@/lib/analytics";
import {
  renderPosterBlob,
  shareOrDownloadBlob,
  type PosterCaptureData,
  type PosterThemeId,
} from "@/lib/poster-client-export";
import type { PosterExportFormatId } from "@/lib/poster-export";

type SaveImageButtonProps = {
  fileUrl?: string | null;
  posterData?: PosterCaptureData | null;
  layoutSourceId?: string;
  fileName?: string;
  tripId?: string;
  shareId?: string | null;
  buttonLabel?: string;
  className?: string;
  formatId?: PosterExportFormatId;
  themeId?: PosterThemeId;
  showHint?: boolean;
};

export function SaveImageButton({
  fileUrl,
  posterData,
  layoutSourceId,
  fileName = "color-hunt-poster.png",
  tripId,
  shareId = null,
  buttonLabel = "Save image",
  className = "button-primary w-full sm:w-auto",
  formatId = "post",
  themeId = "classic",
  showHint = true,
}: SaveImageButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpenImage() {
    setError(null);
    setIsPending(true);

    try {
      trackEvent({
        eventName: "poster_image_opened",
        tripId,
        shareId,
      });

      if (posterData) {
        const blob = await renderPosterBlob({
          posterData,
          formatId,
          layoutSourceId,
          themeId,
        });
        const mode = await shareOrDownloadBlob(blob, fileName);
        trackEvent({
          eventName: mode === "shared" ? "poster_image_shared_native" : "poster_image_downloaded",
          tripId,
          shareId,
          metadata: {
            mode: "canvas_render",
            exportFormat: formatId,
            posterTheme: themeId,
          },
        });
        return;
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
      const mode = await shareOrDownloadBlob(blob, fileName);
      trackEvent({
        eventName: mode === "shared" ? "poster_image_shared_native" : "poster_image_downloaded",
        tripId,
        shareId,
        metadata: {
          mode: "cached_file",
          exportFormat: formatId,
          posterTheme: themeId,
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
          exportFormat: formatId,
          posterTheme: themeId,
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
        {isPending ? "Preparing image..." : posterData || fileUrl ? buttonLabel : "Preparing poster..."}
      </button>
      {showHint ? <p className="mt-2 text-xs text-[var(--muted)]">
        {!posterData && !fileUrl
          ? "The main poster asset is still being prepared. Try again in a moment."
          : isPending
          ? "Opening your phone's save and share options."
          : "Save the poster or pass it into your phone's share sheet."}
      </p> : null}
      {error ? <FeedbackToast kind="error" message={error} onDismiss={() => setError(null)} /> : null}
    </>
  );
}

export type { PosterCaptureData } from "@/lib/poster-client-export";
