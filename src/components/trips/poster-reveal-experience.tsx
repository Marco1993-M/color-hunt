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

type FloatingSticker = {
  id: string;
  toneClassName: string;
  variantClassName: string;
  mascotClassName: string;
};

const FLOATING_STICKERS: FloatingSticker[] = [
  {
    id: "spark",
    toneClassName: "poster-reveal-sticker-spark",
    variantClassName: "poster-reveal-float-one",
    mascotClassName: "mascot-face-spark",
  },
  {
    id: "wink",
    toneClassName: "poster-reveal-sticker-wink",
    variantClassName: "poster-reveal-float-two",
    mascotClassName: "mascot-face-wink",
  },
  {
    id: "heart",
    toneClassName: "poster-reveal-sticker-heart",
    variantClassName: "poster-reveal-float-three",
    mascotClassName: "mascot-face-heart",
  },
];

function RevealSticker({ toneClassName, variantClassName, mascotClassName }: FloatingSticker) {
  return (
    <div className={`poster-reveal-float ${variantClassName}`} aria-hidden="true">
      <div className={`poster-reveal-sticker ${toneClassName}`}>
        <div className={`mascot-face ${mascotClassName}`}>
          <span className="mascot-eye mascot-eye-left" />
          <span className="mascot-eye mascot-eye-right" />
          <span className="mascot-mouth" />
        </div>
      </div>
    </div>
  );
}

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
      {FLOATING_STICKERS.map((sticker) => (
        <RevealSticker key={sticker.id} {...sticker} />
      ))}

      <div className="poster-reveal-stage">
        <section className={`poster-reveal-intro ${stage >= 1 ? "is-visible" : ""}`}>
          <div className="poster-reveal-copy">
            <p className="eyebrow">Final reveal</p>
            <h2 className="panel-title mt-3 text-4xl font-semibold sm:text-5xl">
              {stage >= 2 ? "Your Color Hunt poster is in." : `You hunted ${missionColorName} in ${location}.`}
            </h2>
            <p className="body-copy mt-3 max-w-2xl text-sm sm:text-base">
              {stage >= 2
                ? "One color, one place, nine ordinary details turned into something worth keeping. Let it land, then choose how you want to share it."
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
      </div>

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
