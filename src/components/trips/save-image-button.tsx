"use client";

import { useState } from "react";
import { toBlob } from "html-to-image";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { trackEvent } from "@/lib/analytics";

type SaveImageButtonProps = {
  fileUrl?: string | null;
  captureTargetId?: string;
  fileName?: string;
  tripId?: string;
  shareId?: string | null;
  buttonLabel?: string;
  className?: string;
};

export function SaveImageButton({
  fileUrl,
  captureTargetId,
  fileName = "color-hunt-poster.png",
  tripId,
  shareId = null,
  buttonLabel = "Save image",
  className = "button-primary w-full sm:w-auto",
}: SaveImageButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function blobToDataUrl(blob: Blob) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }

        reject(new Error("Couldn't convert poster image for capture."));
      };
      reader.onerror = () => {
        reject(reader.error ?? new Error("Couldn't convert poster image for capture."));
      };
      reader.readAsDataURL(blob);
    });
  }

  async function waitForRenderFrames(frameCount = 2) {
    for (let index = 0; index < frameCount; index += 1) {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
    }
  }

  async function inlinePosterImages(target: HTMLElement) {
    const images = Array.from(target.querySelectorAll("img"));
    const restorers: Array<() => void> = [];

    await Promise.all(
      images.map(async (image) => {
        const sourceUrl = image.currentSrc || image.src;

        if (!sourceUrl) {
          return;
        }

        try {
          const response = await fetch(sourceUrl, { cache: "force-cache" });

          if (!response.ok) {
            return;
          }

          const dataUrl = await blobToDataUrl(await response.blob());
          const previousSrc = image.getAttribute("src");
          const previousSrcset = image.getAttribute("srcset");
          const previousCrossOrigin = image.getAttribute("crossorigin");

          restorers.push(() => {
            if (previousSrc == null) {
              image.removeAttribute("src");
            } else {
              image.setAttribute("src", previousSrc);
            }

            if (previousSrcset == null) {
              image.removeAttribute("srcset");
            } else {
              image.setAttribute("srcset", previousSrcset);
            }

            if (previousCrossOrigin == null) {
              image.removeAttribute("crossorigin");
            } else {
              image.setAttribute("crossorigin", previousCrossOrigin);
            }
          });

          image.setAttribute("src", dataUrl);
          image.setAttribute("srcset", "");
          image.removeAttribute("crossorigin");
        } catch {
          // Leave the existing src in place if inlining fails.
        }
      }),
    );

    await waitForPosterImages(target);
    await waitForRenderFrames(3);

    return () => {
      restorers.reverse().forEach((restore) => restore());
    };
  }

  async function waitForPosterImages(target: HTMLElement) {
    const images = Array.from(target.querySelectorAll("img"));

    await Promise.all(
      images.map(async (image) => {
        if (!image.currentSrc && !image.src) {
          return;
        }

        if (!image.complete) {
          await new Promise<void>((resolve) => {
            const finish = () => {
              image.removeEventListener("load", finish);
              image.removeEventListener("error", finish);
              resolve();
            };

            image.addEventListener("load", finish, { once: true });
            image.addEventListener("error", finish, { once: true });
          });
        }

        if (typeof image.decode === "function") {
          try {
            await image.decode();
          } catch {
            // Ignore decode failures and let the browser render whatever is available.
          }
        }
      }),
    );
  }

  async function openBlob(blob: Blob) {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    link.rel = "noreferrer";
    link.click();

    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 2000);
  }

  async function shareOrDownloadBlob(blob: Blob) {
    const shareFile = new File([blob], fileName, {
      type: blob.type || "image/png",
    });

    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [shareFile] })
    ) {
      await navigator.share({
        title: "Color Hunt poster",
        files: [shareFile],
      });
      return "shared";
    }

    await openBlob(blob);
    return "downloaded";
  }

  async function handleOpenImage() {
    setError(null);
    setIsPending(true);

    try {
      trackEvent({
        eventName: "poster_image_opened",
        tripId,
        shareId,
      });

      if (captureTargetId) {
        const target = document.getElementById(captureTargetId);

        if (target) {
          await waitForPosterImages(target);
          const restoreImages = await inlinePosterImages(target);

          try {
            await waitForRenderFrames(2);

            const blob = await toBlob(target, {
              cacheBust: true,
              pixelRatio: 2,
              backgroundColor: "#faf6ef",
            });

            if (!blob) {
              throw new Error("Couldn't prepare the poster image.");
            }

            const mode = await shareOrDownloadBlob(blob);
            trackEvent({
              eventName: mode === "shared" ? "poster_image_shared_native" : "poster_image_downloaded",
              tripId,
              shareId,
              metadata: {
                mode: "captured_dom",
              },
            });
          } finally {
            restoreImages();
          }
          return;
        }
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
      const mode = await shareOrDownloadBlob(blob);
      trackEvent({
        eventName: mode === "shared" ? "poster_image_shared_native" : "poster_image_downloaded",
        tripId,
        shareId,
        metadata: {
          mode: "cached_file",
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
        {isPending ? "Preparing image..." : captureTargetId || fileUrl ? buttonLabel : "Preparing poster..."}
      </button>
      <p className="mt-2 text-xs text-[var(--muted)]">
        {!captureTargetId && !fileUrl
          ? "The main poster asset is still being prepared. Try again in a moment."
          : isPending
          ? "Preparing the poster image for your phone’s share and save options."
          : "Open your phone’s native save and share options for the poster."}
      </p>
      {error ? <FeedbackToast kind="error" message={error} onDismiss={() => setError(null)} /> : null}
    </>
  );
}
