"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { posterExportFormats } from "@/lib/poster-export";
import type { PosterExport } from "@/lib/types";

type DownloadPosterButtonProps = {
  shareId: string;
  exportUrls?: Partial<Record<PosterExport["format"], string>>;
};

export function DownloadPosterButton({ shareId, exportUrls }: DownloadPosterButtonProps) {
  const [isPending, setIsPending] = useState(false);

  function handleDownload(formatId: PosterExport["format"]) {
    setIsPending(true);

    trackEvent({
      eventName: "public_poster_downloaded",
      shareId,
      metadata: {
        exportFormat: formatId,
      },
    });

    const link = document.createElement("a");
    link.href = exportUrls?.[formatId] ?? `/poster/${shareId}/download?format=${encodeURIComponent(formatId)}`;
    link.rel = "noreferrer";
    link.click();

    window.setTimeout(() => {
      setIsPending(false);
    }, 600);
  }

  return (
    <div className="download-format-grid">
      {posterExportFormats.map((format) => (
        <button
          key={format.id}
          type="button"
          onClick={() => handleDownload(format.id)}
          className="download-format-card"
          disabled={isPending}
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
  );
}
