"use client";

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
  function handleOpenImage() {
    trackEvent({
      eventName: "poster_image_opened",
      tripId,
      shareId,
    });

    const link = document.createElement("a");
    link.href = fileUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.click();
  }

  return (
    <>
      <button type="button" onClick={handleOpenImage} className={className}>
        {buttonLabel}
      </button>
      <p className="mt-2 text-xs text-[var(--muted)]">Open the actual poster image so you can save it directly.</p>
    </>
  );
}
