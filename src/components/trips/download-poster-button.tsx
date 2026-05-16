"use client";

import { useEffect, useRef, useState } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { trackEvent } from "@/lib/analytics";
import { posterExportFormats } from "@/lib/poster-export";
import {
  openBlob,
  preparePosterBlob,
  renderPosterBlob,
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
  const [error, setError] = useState<string | null>(null);
  const [preparedOptions, setPreparedOptions] = useState<Record<string, boolean>>({});
  const [preparedDownloadUrls, setPreparedDownloadUrls] = useState<Record<string, string>>({});
  const [warmingOptions, setWarmingOptions] = useState<Record<string, boolean>>({});
  const preparedUrlRefs = useRef<Record<string, string>>({});

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

  async function warmOption(option: PosterDownloadOption) {
    if (!posterData || preparedOptions[option.key] || warmingOptions[option.key]) {
      return;
    }

    setWarmingOptions((current) => ({ ...current, [option.key]: true }));

    try {
      const blob = await preparePosterBlob({
        posterData,
        formatId: option.formatId,
        themeId: option.themeId,
      });

      if (option.themeId === "story-collage") {
        const objectUrl = URL.createObjectURL(blob);
        const previousUrl = preparedUrlRefs.current[option.key];

        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }

        preparedUrlRefs.current[option.key] = objectUrl;
        setPreparedDownloadUrls((current) => ({ ...current, [option.key]: objectUrl }));
      }

      setPreparedOptions((current) => ({ ...current, [option.key]: true }));
    } catch (warmingFailure) {
      const message =
        warmingFailure instanceof Error ? warmingFailure.message : "Couldn't prepare this poster format.";
      setError(message);
    } finally {
      setWarmingOptions((current) => ({ ...current, [option.key]: false }));
    }
  }

  function handleToggleOpen() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (!nextOpen || !posterData) {
      return;
    }

    const collageOption = options.find((option) => option.themeId === "story-collage");

    if (!collageOption) {
      return;
    }

    void warmOption(collageOption);
  }

  useEffect(() => {
    return () => {
      Object.values(preparedUrlRefs.current).forEach((objectUrl) => {
        URL.revokeObjectURL(objectUrl);
      });
      preparedUrlRefs.current = {};
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !posterData) {
      return;
    }

    const collageOption = options.find((option) => option.themeId === "story-collage");

    if (!collageOption || preparedOptions[collageOption.key] || warmingOptions[collageOption.key]) {
      return;
    }

    void warmOption(collageOption);
  }, [isOpen, options, posterData, preparedOptions, warmingOptions]);

  async function handleDownload(option: PosterDownloadOption) {
    setError(null);

    if (option.themeId === "story-collage") {
      const preparedUrl = preparedDownloadUrls[option.key];

      if (!preparedUrl) {
        setError("Story collage is still warming up.");
        return;
      }

      trackEvent({
        eventName: "public_poster_downloaded",
        shareId,
        metadata: {
          exportFormat: option.formatId,
          posterTheme: option.themeId,
          mode: "prepared_blob_url",
        },
      });

      const link = document.createElement("a");
      link.href = preparedUrl;
      link.download = `color-hunt-${option.fileSuffix}.png`;
      link.rel = "noreferrer";
      link.click();
      return;
    }

    setIsPending(true);
    const formatMeta = posterExportFormats.find((format) => format.id === option.formatId);

    try {
      if (posterData && formatMeta) {
        const blob = await renderPosterBlob({
          posterData,
          formatId: option.formatId,
          themeId: option.themeId,
        });
        await openBlob(blob, `color-hunt-${option.fileSuffix}.png`);
        trackEvent({
          eventName: "public_poster_downloaded",
          shareId,
          metadata: {
            exportFormat: option.formatId,
            posterTheme: option.themeId,
            mode: "canvas_render_download",
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
    } catch (downloadFailure) {
      const message =
        downloadFailure instanceof Error ? downloadFailure.message : "Couldn't prepare this poster format.";
      trackEvent({
        eventName: "public_poster_download_failed",
        shareId,
        metadata: {
          exportFormat: option.formatId,
          posterTheme: option.themeId,
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
    <div className="flex flex-col gap-3">
      <button
        type="button"
        className="button-secondary w-full sm:w-auto"
        onClick={handleToggleOpen}
        aria-expanded={isOpen}
      >
        {isOpen ? "Hide formats" : buttonLabel}
      </button>

      {isOpen ? (
        <>
          <div className="download-format-grid">
            {options.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => handleDownload(option)}
              className="download-format-card"
              disabled={
                isPending ||
                warmingOptions[option.key] ||
                (option.themeId === "story-collage" && !preparedDownloadUrls[option.key]) ||
                (!posterData && !exportUrls?.[option.formatId])
              }
            >
              <span className={`download-format-preview ${option.previewClassName}`}>
                <span className="download-format-preview-inner" />
              </span>
              <span className="download-format-copy">
                <span className="download-format-label">
                  {isPending
                    ? "Preparing..."
                    : warmingOptions[option.key]
                    ? "Warming..."
                    : option.themeId === "story-collage" && !preparedDownloadUrls[option.key]
                    ? "Warming..."
                    : option.label}
                </span>
                <span className="download-format-description">{option.description}</span>
              </span>
            </button>
            ))}
          </div>
          {error ? <FeedbackToast kind="error" message={error} onDismiss={() => setError(null)} /> : null}
        </>
      ) : null}
    </div>
  );
}
