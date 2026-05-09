"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { posterExportFormats } from "@/lib/poster-export";
import type { PosterExport } from "@/lib/types";

type DownloadPosterButtonProps = {
  shareId: string;
  exportUrls?: Partial<Record<PosterExport["format"], string>>;
  buttonLabel?: string;
};

export function DownloadPosterButton({
  shareId,
  exportUrls,
  buttonLabel = "More formats",
}: DownloadPosterButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const availableFormats = posterExportFormats.filter((format) => Boolean(exportUrls?.[format.id]));
  const allFormatsReady = availableFormats.length === posterExportFormats.length;

  function handleDownload(formatId: PosterExport["format"]) {
    const targetUrl = exportUrls?.[formatId];

    if (!targetUrl) {
      return;
    }

    setIsPending(true);

    trackEvent({
      eventName: "public_poster_downloaded",
      shareId,
      metadata: {
        exportFormat: formatId,
      },
    });

    const link = document.createElement("a");
    link.href = targetUrl;
    link.rel = "noreferrer";
    link.click();

    window.setTimeout(() => {
      setIsPending(false);
    }, 600);
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        className="button-secondary w-full sm:w-auto"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        disabled={!allFormatsReady}
      >
        {!allFormatsReady ? "Preparing formats..." : isOpen ? "Hide formats" : buttonLabel}
      </button>

      {isOpen ? (
        <div className="download-format-grid">
          {posterExportFormats.map((format) => (
            <button
              key={format.id}
              type="button"
              onClick={() => handleDownload(format.id)}
              className="download-format-card"
              disabled={isPending || !exportUrls?.[format.id]}
            >
              <span className={`download-format-preview download-format-preview-${format.id}`}>
                <span className="download-format-preview-inner" />
              </span>
              <span className="download-format-copy">
                <span className="download-format-label">{isPending ? "Preparing..." : format.label}</span>
                <span className="download-format-description">{format.description}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {!allFormatsReady ? (
        <p className="text-xs text-[var(--muted)]">
          Extra poster sizes are still being prepared. The default poster will be ready first.
        </p>
      ) : null}
    </div>
  );
}
