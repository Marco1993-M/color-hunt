"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

type EventOnViewProps = {
  eventName: string;
  tripId?: string | null;
  shareId?: string | null;
  metadata?: Record<string, unknown>;
};

export function EventOnView({ eventName, tripId = null, shareId = null, metadata = {} }: EventOnViewProps) {
  const metadataKey = JSON.stringify(metadata);

  useEffect(() => {
    trackEvent({
      eventName,
      tripId,
      shareId,
      metadata,
    });
  }, [eventName, metadataKey, shareId, tripId]);

  return null;
}
