"use client";

type AnalyticsPayload = {
  eventName: string;
  tripId?: string | null;
  shareId?: string | null;
  metadata?: Record<string, unknown>;
};

const SESSION_STORAGE_KEY = "spd_session_id";
const JOURNEY_STORAGE_KEY = "spd_journey_id";

function getOrCreateStorageId(storage: Storage, key: string) {
  const existing = storage.getItem(key);

  if (existing) {
    return existing;
  }

  const nextId = crypto.randomUUID();
  storage.setItem(key, nextId);
  return nextId;
}

export function getAnalyticsIds() {
  try {
    return {
      sessionId: getOrCreateStorageId(window.sessionStorage, SESSION_STORAGE_KEY),
      journeyId: getOrCreateStorageId(window.localStorage, JOURNEY_STORAGE_KEY),
    };
  } catch {
    return {
      sessionId: crypto.randomUUID(),
      journeyId: crypto.randomUUID(),
    };
  }
}

export async function trackEvent({ eventName, tripId = null, shareId = null, metadata = {} }: AnalyticsPayload) {
  try {
    const { sessionId, journeyId } = getAnalyticsIds();
    const response = await fetch("/api/events", {
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
        sessionId,
        journeyId,
        metadata,
      }),
    });

    if (!response.ok && process.env.NODE_ENV !== "production") {
      console.warn("Analytics request was not accepted", {
        eventName,
        status: response.status,
      });
    }
  } catch {
    // Analytics should never interrupt the main experience.
  }
}
