"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { posterExportFormats } from "@/lib/poster-export";

type DownloadPosterButtonProps = {
  shareId: string;
};

export function DownloadPosterButton({ shareId }: DownloadPosterButtonProps) {
  const [isPending, setIsPending] = useState(false);

  function handleDownload(formatId: string) {
    setIsPending(true);

    trackEvent({
      eventName: "public_poster_downloaded",
      shareId,
      metadata: {
        exportFormat: formatId,
      },
    });

    const link = document.createElement("a");
    link.href = `/poster/${shareId}/download?format=${encodeURIComponent(formatId)}`;
    link.click();

    window.setTimeout(() => {
      setIsPending(false);
    }, 600);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {posterExportFormats.map((format) => (
        <button
          key={format.id}
          type="button"
          onClick={() => handleDownload(format.id)}
          className="rounded-full border border-[rgba(53,37,30,0.1)] bg-white/70 px-3 py-2 text-left text-xs text-[var(--foreground)] transition hover:border-[rgba(53,37,30,0.22)] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
          disabled={isPending}
        >
          <span className="block font-semibold tracking-[0.12em] uppercase">{isPending ? "Preparing..." : format.label}</span>
          <span className="block text-[0.72rem] normal-case tracking-normal opacity-80">{format.description}</span>
        </button>
      ))}
    </div>
  );
}
