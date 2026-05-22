"use client";

import { useEffect, useState } from "react";
import { getAnalyticsIds } from "@/lib/analytics";

function readAnalyticsIds() {
  if (typeof window === "undefined") {
    return {
      journeyId: "",
      sessionId: "",
    };
  }

  const { journeyId, sessionId } = getAnalyticsIds();

  return {
    journeyId,
    sessionId,
  };
}

export function AnalyticsHiddenFields() {
  const [ids, setIds] = useState(readAnalyticsIds);

  useEffect(() => {
    setIds(readAnalyticsIds());
  }, []);

  return (
    <>
      <input type="hidden" name="analytics_session_id" value={ids.sessionId} />
      <input type="hidden" name="analytics_journey_id" value={ids.journeyId} />
    </>
  );
}
