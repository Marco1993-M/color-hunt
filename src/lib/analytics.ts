"use client";

type AnalyticsPayload = {
  eventName: string;
  tripId?: string | null;
  shareId?: string | null;
  metadata?: Record<string, unknown>;
};

function getSessionId() {
  const storageKey = "spd_session_id";
  const existing = window.sessionStorage.getItem(storageKey);

  if (existing) {
    return existing;
  }

  const nextId = crypto.randomUUID();
  window.sessionStorage.setItem(storageKey, nextId);
  return nextId;
}

export async function trackEvent({ eventName, tripId = null, shareId = null, metadata = {} }: AnalyticsPayload) {
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      keepalive: true,
      body: JSON.stringify({
        eventName,
        tripId,
        shareId,
        path: window.location.pathname,
        sessionId: getSessionId(),
        metadata,
      }),
    });
  } catch {
    // Analytics should never interrupt the main experience.
  }
}
