"use client";

import { useEffect, useMemo, useState } from "react";
import { trackEvent } from "@/lib/analytics";

type PosterRevealExperienceProps = {
  tripId: string;
  location: string;
  missionColorName: string;
  frameCount: number;
  maxPhotos: number;
  poster: React.ReactNode;
  actions: React.ReactNode;
};

const REVEAL_STEP_MS = 900;

export function PosterRevealExperience({
  tripId,
  location,
  missionColorName,
  frameCount,
  maxPhotos,
  poster,
  actions,
}: PosterRevealExperienceProps) {
  const [stage, setStage] = useState(1);
  const [revealRun, setRevealRun] = useState(0);

  const revealSummary = useMemo(
    () => [
      `One place`,
      `${missionColorName} mission`,
      `${frameCount}/${maxPhotos} frames`,
    ],
    [frameCount, maxPhotos, missionColorName],
  );

  useEffect(() => {
    setStage(1);
    trackEvent({
      eventName: "poster_reveal_started",
      tripId,
      metadata: {
        colorName: missionColorName,
        frameCount,
        location,
        maxPhotos,
      },
    });

    const timers = [0, 1].map((index) =>
      window.setTimeout(() => {
        setStage(index + 2);

        if (index === 1) {
          trackEvent({
            eventName: "poster_reveal_completed",
            tripId,
            metadata: {
              colorName: missionColorName,
              frameCount,
              location,
            },
          });
        }
      }, REVEAL_STEP_MS * (index + 1)),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [frameCount, location, maxPhotos, missionColorName, revealRun, tripId]);

  function handleReplay() {
    trackEvent({
      eventName: "poster_reveal_replayed",
      tripId,
      metadata: {
        colorName: missionColorName,
      },
    });
    setRevealRun((current) => current + 1);
  }

  return (
    <div className="poster-reveal-shell">
      <div className="poster-reveal-aurora" aria-hidden="true" />

      <section className={`poster-reveal-intro ${stage >= 1 ? "is-visible" : ""}`}>
        <div className="poster-reveal-copy">
          <p className="eyebrow">Final reveal</p>
          <h2 className="panel-title mt-3 text-3xl font-semibold sm:text-4xl">
            {stage >= 2 ? "Your Color Hunt poster is in." : `You hunted ${missionColorName} in ${location}.`}
          </h2>
          <p className="body-copy mt-3 max-w-2xl text-sm sm:text-base">
            {stage >= 2
              ? "The ordinary details are now one finished keepsake. Let it land for a second, then choose how you want to share it."
              : "Nine frames, one color, one place. The reveal is building."}
          </p>
        </div>

        <div className={`poster-reveal-facts ${stage >= 1 ? "is-visible" : ""}`}>
          {revealSummary.map((item) => (
            <span key={item} className="poster-reveal-chip">
              {item}
            </span>
          ))}
        </div>
      </section>

      <div className={`poster-reveal-poster ${stage >= 2 ? "is-visible" : ""}`}>{poster}</div>

      <div className={`poster-reveal-actions ${stage >= 3 ? "is-visible" : ""}`}>
        <div className="mb-4 flex justify-end">
          <button className="button-secondary w-full sm:w-auto" type="button" onClick={handleReplay}>
            Replay reveal
          </button>
        </div>
        {actions}
      </div>
    </div>
  );
}
