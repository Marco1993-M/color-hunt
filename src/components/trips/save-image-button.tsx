"use client";

import { useState } from "react";
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

  function handleOpenImage() {
    setIsPending(true);
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

    window.setTimeout(() => {
      setIsPending(false);
    }, 1800);
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
    </>
  );
}
