"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

type PosterReadyWatcherProps = {
  tripId: string;
  enabled: boolean;
  hasPostExport: boolean;
};

export function PosterReadyWatcher({ tripId, enabled, hasPostExport }: PosterReadyWatcherProps) {
  const router = useRouter();
  const hasRefreshedRef = useRef(false);

  useEffect(() => {
    if (!enabled || hasPostExport || hasRefreshedRef.current) {
      return;
    }

    let isCancelled = false;
    let timeoutId: number | null = null;

    async function pollForPoster() {
      try {
        const response = await fetch(`/api/poster-exports/status?tripId=${encodeURIComponent(tripId)}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Poster export status check failed with status ${response.status}.`);
        }

        const payload = (await response.json()) as {
          exports?: Partial<Record<"post" | "story" | "square", string | null>>;
        };

        if (payload.exports?.post) {
          hasRefreshedRef.current = true;
          trackEvent({
            eventName: "poster_export_ready_seen",
            tripId,
          });
          router.refresh();
          return;
        }
      } catch (error) {
        trackEvent({
          eventName: "poster_export_ready_watch_failed",
          tripId,
          metadata: {
            message: error instanceof Error ? error.message : "unknown_failure",
          },
        });
      }

      if (!isCancelled) {
        timeoutId = window.setTimeout(pollForPoster, 2000);
      }
    }

    void pollForPoster();

    return () => {
      isCancelled = true;
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [enabled, hasPostExport, router, tripId]);

  return null;
}
