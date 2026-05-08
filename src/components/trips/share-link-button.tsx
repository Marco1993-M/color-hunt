"use client";

import { useEffect, useMemo, useState } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { trackEvent } from "@/lib/analytics";

function parseFileName(response: Response, fallback: string) {
  const disposition = response.headers.get("content-disposition");
  const match = disposition?.match(/filename="([^"]+)"/);
  return match?.[1] ?? fallback;
}

type ShareLinkButtonProps = {
  shareId?: string | null;
  tripId?: string;
  url: string;
  title: string;
  text: string;
  fileUrl?: string | null;
  fileName?: string;
  buttonLabel?: string;
  buttonDescription?: string;
  eventName?: string;
  metadata?: Record<string, unknown>;
  className?: string;
};

export function ShareLinkButton({
  shareId = null,
  tripId,
  url,
  title,
  text,
  fileUrl = null,
  fileName = "color-hunt-poster.png",
  buttonLabel = "Share poster",
  buttonDescription = "Open your phone’s share sheet",
  eventName = "poster_link_shared_native",
  metadata = {},
  className = "button-primary w-full sm:w-auto",
}: ShareLinkButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [prefetchedFile, setPrefetchedFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fallbackLabel = useMemo(() => (buttonDescription ? buttonDescription : null), [buttonDescription]);

  useEffect(() => {
    if (!fileUrl || typeof window === "undefined") {
      return;
    }

    let isActive = true;
    const controller = new AbortController();
    const fileUrlToPrefetch = fileUrl;

    async function prefetchShareFile() {
      try {
        const response = await fetch(fileUrlToPrefetch, { signal: controller.signal });

        if (!response.ok) {
          return;
        }

        const blob = await response.blob();

        if (!isActive) {
          return;
        }

        setPrefetchedFile(
          new File([blob], parseFileName(response, fileName), {
            type: blob.type || "image/png",
          }),
        );
      } catch {
        // Silent by design. This is only a performance warm-up.
      }
    }

    void prefetchShareFile();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [fileName, fileUrl]);

  async function handleShare() {
    setIsPending(true);
    setError(null);
    setMessage(null);

    try {
      if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
        await navigator.clipboard.writeText(url);
        trackEvent({
          eventName: `${eventName}_copied`,
          tripId,
          shareId,
          metadata,
        });
        setMessage("Share link copied.");
        return;
      }

      if (fileUrl) {
        let file = prefetchedFile;

        if (!file) {
          const response = await fetch(fileUrl);

          if (!response.ok) {
            throw new Error("Couldn't prepare the poster image.");
          }

          const blob = await response.blob();
          file = new File([blob], parseFileName(response, fileName), {
            type: blob.type || "image/png",
          });
          setPrefetchedFile(file);
        }

        if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title,
            text,
            files: [file],
          });
          trackEvent({
            eventName,
            tripId,
            shareId,
            metadata: {
              ...metadata,
              mode: "file",
            },
          });
          setMessage("Share sheet opened.");
          return;
        }
      }

      await navigator.share({ title, text, url });
      trackEvent({
        eventName,
        tripId,
        shareId,
        metadata: {
          ...metadata,
          mode: "url",
        },
      });
      setMessage("Share sheet opened.");
    } catch (shareFailure) {
      const nextError = shareFailure instanceof Error ? shareFailure.message : "Couldn't open the share sheet.";
      trackEvent({
        eventName: `${eventName}_failed`,
        tripId,
        shareId,
        metadata: {
          ...metadata,
          message: nextError,
        },
      });
      setError(nextError);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button type="button" onClick={handleShare} className={className} disabled={isPending}>
        {isPending ? "Preparing..." : buttonLabel}
      </button>
      {fallbackLabel ? <p className="mt-2 text-xs text-[var(--muted)]">{fallbackLabel}</p> : null}
      {message ? <FeedbackToast kind="success" message={message} onDismiss={() => setMessage(null)} /> : null}
      {error ? <FeedbackToast kind="error" message={error} onDismiss={() => setError(null)} /> : null}
    </>
  );
}
