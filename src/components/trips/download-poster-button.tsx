"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { posterExportFormats } from "@/lib/poster-export";
import {
  renderPosterBlob,
  shareOrDownloadBlob,
  type PosterCaptureData,
  type PosterThemeId,
} from "@/lib/poster-client-export";
import type { PosterExport } from "@/lib/types";

type DownloadPosterButtonProps = {
  shareId: string;
  exportUrls?: Partial<Record<PosterExport["format"], string>>;
  posterData?: PosterCaptureData | null;
  buttonLabel?: string;
};

type PosterDownloadOption = {
  key: string;
  formatId: PosterExport["format"];
  themeId: PosterThemeId;
  label: string;
  description: string;
  fileSuffix: string;
  previewClassName: string;
};

export function DownloadPosterButton({
  shareId,
  exportUrls,
  posterData,
  buttonLabel = "More formats",
}: DownloadPosterButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const options: PosterDownloadOption[] = [
    ...posterExportFormats.map((format) => ({
      key: format.id,
      formatId: format.id,
      themeId: "classic" as const,
      label: format.label,
      description: format.description,
      fileSuffix: format.fileSuffix,
      previewClassName: `download-format-preview-${format.id}`,
    })),
    ...(posterData
      ? [
          {
            key: "story-collage",
            formatId: "story" as const,
            themeId: "story-collage" as const,
            label: "Story collage",
            description: "Taped 9:16 collage",
            fileSuffix: "story-collage-9x16",
            previewClassName: "download-format-preview-story-collage",
          },
        ]
      : []),
  ];

  async function handleDownload(option: PosterDownloadOption) {
    setIsPending(true);
    const formatMeta = posterExportFormats.find((format) => format.id === option.formatId);

    try {
      if (posterData && formatMeta) {
        const blob = await renderPosterBlob({
          posterData,
          formatId: option.formatId,
          themeId: option.themeId,
        });
        const mode = await shareOrDownloadBlob(
          blob,
          `color-hunt-${option.fileSuffix}.png`,
        );
        trackEvent({
          eventName: mode === "shared" ? "public_poster_shared_native" : "public_poster_downloaded",
          shareId,
          metadata: {
            exportFormat: option.formatId,
            posterTheme: option.themeId,
            mode: "canvas_render",
          },
        });
        return;
      }

      const targetUrl = exportUrls?.[option.formatId];

      if (!targetUrl) {
        return;
      }

      trackEvent({
        eventName: "public_poster_downloaded",
        shareId,
        metadata: {
          exportFormat: option.formatId,
          posterTheme: option.themeId,
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
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => handleDownload(option)}
              className="download-format-card"
              disabled={isPending || (!posterData && !exportUrls?.[option.formatId])}
            >
              <span className={`download-format-preview ${option.previewClassName}`}>
                <span className="download-format-preview-inner" />
              </span>
              <span className="download-format-copy">
                <span className="download-format-label">{isPending ? "Preparing..." : option.label}</span>
                <span className="download-format-description">{option.description}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
