"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

type PosterExportWarmupProps = {
  tripId: string;
  enabled: boolean;
};

export function PosterExportWarmup({ tripId, enabled }: PosterExportWarmupProps) {
  const hasStartedRef = useRef(false);
  const hasRefreshedRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (!enabled || hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;
    const controller = new AbortController();

    async function generateFormats(formats: ("post" | "story" | "square")[], signal?: AbortSignal) {
      const response = await fetch("/api/poster-exports/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ tripId, formats }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`Poster export warmup failed with status ${response.status}.`);
      }
    }

    async function waitForFormat(format: "post" | "story" | "square", signal?: AbortSignal) {
      for (let attempt = 0; attempt < 24; attempt += 1) {
        if (signal?.aborted) {
          return false;
        }

        const response = await fetch(`/api/poster-exports/status?tripId=${encodeURIComponent(tripId)}`, {
          cache: "no-store",
          signal,
        });

        if (!response.ok) {
          throw new Error(`Poster export status check failed with status ${response.status}.`);
        }

        const payload = (await response.json()) as {
          exports?: Partial<Record<"post" | "story" | "square", string | null>>;
        };

        if (payload.exports?.[format]) {
          return true;
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      return false;
    }

    async function warmPosterExports() {
      try {
        void generateFormats(["post"], controller.signal).catch((error) => {
          trackEvent({
            eventName: "poster_export_post_warm_failed",
            tripId,
            metadata: {
              message: error instanceof Error ? error.message : "unknown_failure",
            },
          });
        });
        const postReady = await waitForFormat("post", controller.signal);

        if (!postReady) {
          return;
        }

        trackEvent({
          eventName: "poster_export_post_warmed",
          tripId,
        });

        if (!hasRefreshedRef.current) {
          hasRefreshedRef.current = true;
          router.refresh();
        }

        void generateFormats(["story", "square"]).then(
          () => {
            trackEvent({
              eventName: "poster_export_secondary_warmed",
              tripId,
            });
          },
          (error) => {
            trackEvent({
              eventName: "poster_export_secondary_warm_failed",
              tripId,
              metadata: {
                message: error instanceof Error ? error.message : "unknown_failure",
              },
            });
          },
        );
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        trackEvent({
          eventName: "poster_export_post_warm_failed",
          tripId,
          metadata: {
            message: error instanceof Error ? error.message : "unknown_failure",
          },
        });
      }
    }

    void warmPosterExports();

    return () => {
      controller.abort();
    };
  }, [enabled, router, tripId]);

  return null;
}
