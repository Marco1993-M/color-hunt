"use client";

import { useEffect, useRef } from "react";
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
  const sessionRef = useRef<HTMLInputElement>(null);
  const journeyRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const ids = readAnalyticsIds();
    if (sessionRef.current) sessionRef.current.value = ids.sessionId;
    if (journeyRef.current) journeyRef.current.value = ids.journeyId;
  }, []);
  return <>
    <input ref={sessionRef} type="hidden" name="analytics_session_id" defaultValue="" />
    <input ref={journeyRef} type="hidden" name="analytics_journey_id" defaultValue="" />
  </>;
}
