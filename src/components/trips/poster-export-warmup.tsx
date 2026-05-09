"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

type PosterExportWarmupProps = {
  tripId: string;
  enabled: boolean;
};

export function PosterExportWarmup({ tripId, enabled }: PosterExportWarmupProps) {
  const hasStartedRef = useRef(false);

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
        keepalive: true,
        signal,
      });

      if (!response.ok) {
        throw new Error(`Poster export warmup failed with status ${response.status}.`);
      }
    }

    async function warmPosterExports() {
      try {
        await generateFormats(["post"], controller.signal);

        trackEvent({
          eventName: "poster_export_post_warmed",
          tripId,
        });

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
  }, [enabled, tripId]);

  return null;
}
