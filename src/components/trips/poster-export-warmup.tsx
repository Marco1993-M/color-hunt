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

    async function warmPosterExports() {
      try {
        const response = await fetch("/api/poster-exports/generate", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ tripId }),
          keepalive: true,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Poster export warmup failed with status ${response.status}.`);
        }

        trackEvent({
          eventName: "poster_exports_warmed",
          tripId,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        trackEvent({
          eventName: "poster_exports_warm_failed",
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
