"use client";

import { useMemo, useState, useTransition } from "react";
import { missionSeeds } from "@/lib/missions";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { trackEvent } from "@/lib/analytics";
import { DownloadPosterButton } from "@/components/trips/download-poster-button";
import { getRetentionSummaryLabel } from "@/lib/retention";
import { ShareLinkButton } from "@/components/trips/share-link-button";
import { SaveImageButton, type PosterCaptureData } from "@/components/trips/save-image-button";
import { createClient } from "@/lib/supabase/client";
import type { PosterExport } from "@/lib/types";

type SharePosterPanelProps = {
  tripId: string;
  initialShareId: string | null;
  initialIsPublic: boolean;
  schemaReady: boolean;
  currentPhotoCount: number;
  maxPhotos: number;
  tripTitle: string;
  location: string;
  startDate: string | null;
  endDate: string | null;
  missionColorName: string;
  exportUrls?: Partial<Record<PosterExport["format"], string>>;
  posterData?: PosterCaptureData | null;
};

type SupabaseErrorLike = {
  code?: string;
  message?: string;
};

function isMissingShareSchema(error: SupabaseErrorLike | null | undefined) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

export function SharePosterPanel({
  tripId,
  initialShareId,
  initialIsPublic,
  schemaReady,
  currentPhotoCount,
  maxPhotos,
  tripTitle,
  location,
  startDate,
  endDate,
  missionColorName,
  exportUrls,
  posterData,
}: SharePosterPanelProps) {
  const [shareId, setShareId] = useState(initialShareId);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [challengeColorName, setChallengeColorName] = useState(missionColorName);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isComplete = currentPhotoCount >= maxPhotos;
  const retentionSummary = getRetentionSummaryLabel({
    isPublic,
    photoCount: currentPhotoCount,
    maxPhotos,
  });

  async function warmPosterExports() {
    async function generateFormats(formats: ("post" | "story" | "square")[]) {
      const response = await fetch("/api/poster-exports/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ tripId, formats }),
      });

      if (!response.ok) {
        throw new Error(`Poster export warmup failed with status ${response.status}.`);
      }
    }

    try {
      await generateFormats(["post"]);

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
        (failure) => {
          trackEvent({
            eventName: "poster_export_secondary_warm_failed",
            tripId,
            metadata: {
              message: failure instanceof Error ? failure.message : "unknown_failure",
            },
          });
        },
      );
    } catch (failure) {
      trackEvent({
        eventName: "poster_export_post_warm_failed",
        tripId,
        metadata: {
          message: failure instanceof Error ? failure.message : "unknown_failure",
        },
      });
    }
  }

  const shareUrl = useMemo(() => {
    if (!shareId) {
      return null;
    }

    if (typeof window === "undefined") {
      return `/poster/${shareId}`;
    }

    return `${window.location.origin}/poster/${shareId}`;
  }, [shareId]);

  const challengeUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const url = new URL("/", window.location.origin);
    url.searchParams.set("challengeColor", challengeColorName);
    url.searchParams.set("challengeLocation", location);
    url.searchParams.set("challengeTitle", tripTitle);
    if (startDate) {
      url.searchParams.set("challengeStartDate", startDate);
    }
    if (endDate) {
      url.searchParams.set("challengeEndDate", endDate);
    }
    url.searchParams.set("challengeShareId", shareId ?? "");
    url.hash = "start";
    return url.toString();
  }, [challengeColorName, endDate, location, shareId, startDate, tripTitle]);

  function handleToggle(nextValue: boolean) {
    setError(null);
    setMessage(null);

    if (nextValue && !isComplete) {
      trackEvent({
        eventName: "poster_publish_blocked_incomplete",
        tripId,
        metadata: {
          currentPhotoCount,
          maxPhotos,
        },
      });
      setError(`Finish all ${maxPhotos} frames before publishing the poster.`);
      return;
    }

    startTransition(async () => {
      try {
        const nextShareId = shareId ?? crypto.randomUUID();
        const supabase = createClient();
        const result = await supabase
          .from("trips")
          .update({
            is_public: nextValue,
            share_id: nextShareId,
          })
          .eq("id", tripId)
          .select("share_id, is_public")
          .single();

        const updateError = result.error as SupabaseErrorLike | null;

        if (isMissingShareSchema(updateError)) {
          throw new Error("Sharing needs the latest Supabase SQL before it can be turned on.");
        }

        if (updateError) {
          throw updateError;
        }

        setShareId(result.data?.share_id ?? nextShareId);
        setIsPublic(result.data?.is_public ?? nextValue);
        if (nextValue) {
          void warmPosterExports();
        }
        trackEvent({
          eventName: nextValue ? "poster_published" : "poster_unpublished",
          tripId,
          shareId: result.data?.share_id ?? nextShareId,
          metadata: {
            currentPhotoCount,
            maxPhotos,
          },
        });
        setMessage(nextValue ? "Poster link is live." : "Public sharing is now turned off.");
      } catch (failure) {
        trackEvent({
          eventName: nextValue ? "poster_publish_failed" : "poster_unpublish_failed",
          tripId,
          shareId,
          metadata: {
            message: failure instanceof Error ? failure.message : "unknown_failure",
          },
        });
        setError(failure instanceof Error ? failure.message : "Unable to update sharing right now.");
      }
    });
  }

  async function handleCopyLink() {
    if (!shareUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      trackEvent({
        eventName: "share_link_copied",
        tripId,
        shareId,
      });
      setError(null);
      setMessage("Share link copied.");
    } catch {
      trackEvent({
        eventName: "share_link_copy_failed",
        tripId,
        shareId,
      });
      setError("Could not copy the share link automatically.");
    }
  }

  return (
    <div className="glass-panel rounded-[1.8rem] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Share Poster</p>
          <h3 className="panel-title mt-2 text-2xl font-semibold">Give this Color Hunt poster a public URL.</h3>
          <p className="body-copy mt-3 max-w-2xl text-sm sm:text-base">
            Turn sharing on when the grid feels ready. The public page keeps the focus on the finished poster, not the private trip tools.
          </p>
        </div>
        <button
          className={`${isPublic ? "button-secondary" : "button-primary"} w-full sm:w-auto`}
          type="button"
          onClick={() => handleToggle(!isPublic)}
          disabled={isPending || !schemaReady}
        >
          {isPending ? "Saving..." : isPublic ? "Turn sharing off" : "Publish poster"}
        </button>
      </div>

      {!isComplete ? (
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          Finish all {maxPhotos} frames before publishing. The public page and downloads are reserved for completed posters.
        </p>
      ) : null}

      {!schemaReady ? (
        <p className="mt-4 text-sm leading-7 text-[#a0611d]">
          Sharing is ready in the app, but your database still needs the latest `supabase/schema.sql` updates first.
        </p>
      ) : null}

      {isPublic && shareUrl ? (
        <div className="mt-5 rounded-[1.4rem] border border-[rgba(53,37,30,0.1)] bg-[rgba(255,255,255,0.55)] p-4">
          <p className="eyebrow">Share and Download</p>
          <p className="body-copy mt-2 text-sm">
            Your poster is live. Save it fast, share it natively, or send the challenge on while the moment still feels fresh.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <SaveImageButton
              tripId={tripId}
              shareId={shareId}
              posterData={posterData}
              layoutSourceId="trip-poster-sheet"
              fileUrl={exportUrls?.post}
              fileName={`${location.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "color-hunt"}-post-4x5.png`}
              buttonLabel="Save poster"
            />
            <ShareLinkButton
              tripId={tripId}
              shareId={shareId}
              url={shareUrl}
              title={`Color Hunt · ${location}`}
              text={`One place. One color. Nine moments. ${location}`}
              fileUrl={exportUrls?.post ?? null}
              buttonLabel="Share poster"
              buttonDescription="Share the finished poster from your phone’s native sheet"
            />
            <button className="button-secondary w-full sm:w-auto" type="button" onClick={handleCopyLink}>
              Copy poster link
            </button>
          </div>

          <div className="mt-5">
            <DownloadPosterButton
              shareId={shareId!}
              exportUrls={exportUrls}
              posterData={posterData}
              buttonLabel="More formats"
            />
          </div>

          <p className="eyebrow mt-5">Public Link</p>
          <p className="body-copy mt-2 break-all text-sm">{shareUrl}</p>
          <a
            className="button-secondary mt-4 w-full sm:w-auto"
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() =>
              trackEvent({
                eventName: "share_link_opened_from_dashboard",
                tripId,
                shareId,
              })
            }
          >
            View public poster
          </a>

          <div className="mt-5 rounded-[1.3rem] border border-[rgba(53,37,30,0.08)] bg-white/55 p-4">
            <p className="eyebrow">Challenge a friend</p>
            <p className="body-copy mt-2 text-sm">
              Invite someone into the same place and trip window, but give them a different color to hunt so the posters come out completely different.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label className="field-label" htmlFor="challenge-color-name">
                  Challenge color
                </label>
                <select
                  id="challenge-color-name"
                  className="field-input"
                  value={challengeColorName}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setChallengeColorName(nextValue);
                    trackEvent({
                      eventName: "challenge_color_changed",
                      tripId,
                      shareId,
                      metadata: {
                        challengeColorName: nextValue,
                      },
                    });
                  }}
                >
                  {missionSeeds.map((mission) => (
                    <option key={mission.color_name} value={mission.color_name}>
                      {mission.color_name}
                    </option>
                  ))}
                </select>
              </div>
              {challengeUrl ? (
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                  <ShareLinkButton
                    tripId={tripId}
                    shareId={shareId}
                    url={challengeUrl}
                    title={`You've been challenged to hunt ${challengeColorName}`}
                    text={`Take on the ${challengeColorName} Color Hunt in ${location}. Collect nine moments and make your own poster.`}
                    buttonLabel="Share challenge"
                    buttonDescription="Send a challenge invite from your phone’s native share sheet"
                    eventName="challenge_link_shared_native"
                    metadata={{
                      challengeColorName,
                    }}
                    className="button-primary w-full sm:w-auto"
                  />
                  <button
                    className="button-secondary w-full sm:w-auto"
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(challengeUrl);
                        trackEvent({
                          eventName: "challenge_link_copied",
                          tripId,
                          shareId,
                          metadata: {
                            challengeColorName,
                          },
                        });
                        setMessage("Challenge invite copied.");
                        setError(null);
                      } catch {
                        setError("Could not copy the challenge link automatically.");
                      }
                    }}
                  >
                    Copy invite link
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <p className="body-copy mt-4 text-xs sm:text-sm">
        Storage note: raw trip photos are temporary working files. Right now, {retentionSummary}.
      </p>

      {message ? <FeedbackToast kind="success" message={message} onDismiss={() => setMessage(null)} /> : null}
      {error ? <FeedbackToast kind="error" message={error} onDismiss={() => setError(null)} /> : null}
    </div>
  );
}
