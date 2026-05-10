"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { posterExportFormats } from "@/lib/poster-export";
import {
  renderPosterBlob,
  shareOrDownloadBlob,
  type PosterCaptureData,
} from "@/lib/poster-client-export";
import type { PosterExport } from "@/lib/types";

type DownloadPosterButtonProps = {
  shareId: string;
  exportUrls?: Partial<Record<PosterExport["format"], string>>;
  posterData?: PosterCaptureData | null;
  buttonLabel?: string;
};

export function DownloadPosterButton({
  shareId,
  exportUrls,
  posterData,
  buttonLabel = "More formats",
}: DownloadPosterButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  async function handleDownload(formatId: PosterExport["format"]) {
    setIsPending(true);
    const formatMeta = posterExportFormats.find((format) => format.id === formatId);

    try {
      if (posterData && formatMeta) {
        const blob = await renderPosterBlob({
          posterData,
          formatId,
        });
        const mode = await shareOrDownloadBlob(
          blob,
          `color-hunt-${formatMeta.fileSuffix}.png`,
        );
        trackEvent({
          eventName: mode === "shared" ? "public_poster_shared_native" : "public_poster_downloaded",
          shareId,
          metadata: {
            exportFormat: formatId,
            mode: "canvas_render",
          },
        });
        return;
      }

      const targetUrl = exportUrls?.[formatId];

      if (!targetUrl) {
        return;
      }

      trackEvent({
        eventName: "public_poster_downloaded",
        shareId,
        metadata: {
          exportFormat: formatId,
          mode: "cached_file",
        },
      });

      const link = document.createElement("a");
      link.href = targetUrl;
      link.rel = "noreferrer";
      link.click();
    } finally {
      window.setTimeout(() => {
        setIsPending(false);
      }, 350);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        className="button-secondary w-full sm:w-auto"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        {isOpen ? "Hide formats" : buttonLabel}
      </button>

      {isOpen ? (
        <div className="download-format-grid">
          {posterExportFormats.map((format) => (
            <button
              key={format.id}
              type="button"
              onClick={() => handleDownload(format.id)}
              className="download-format-card"
              disabled={isPending || (!posterData && !exportUrls?.[format.id])}
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
    </div>
  );
}
