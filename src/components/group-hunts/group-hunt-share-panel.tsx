"use client";

import { useMemo } from "react";
import { updateGroupHuntSharingAction } from "@/app/actions";
import { AnalyticsHiddenFields } from "@/components/analytics/analytics-hidden-fields";
import { ShareLinkButton } from "@/components/trips/share-link-button";

type GroupHuntSharePanelProps = {
  groupHuntId: string;
  groupHuntTitle: string;
  location: string;
  initialShareId: string | null;
  initialIsPublic: boolean;
};

export function GroupHuntSharePanel({
  groupHuntId,
  groupHuntTitle,
  location,
  initialShareId,
  initialIsPublic,
}: GroupHuntSharePanelProps) {
  const shareUrl = useMemo(() => {
    if (!initialShareId) {
      return null;
    }

    return `/group-results/${initialShareId}`;
  }, [initialShareId]);

  return (
    <section className="mt-8 rounded-[1.6rem] border border-[rgba(53,37,30,0.08)] bg-white/70 p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="eyebrow">Share Group Result</p>
          <h2 className="panel-title mt-2 text-2xl font-semibold">Turn the combined board into one public artifact.</h2>
          <p className="body-copy mt-2 max-w-3xl text-sm sm:text-base">
            Publish one shared group result page once everyone is done, then send that single link around instead of asking people to compare individual posters manually.
          </p>
        </div>

        <form action={updateGroupHuntSharingAction} className="w-full lg:w-auto">
          <AnalyticsHiddenFields />
          <input type="hidden" name="group_hunt_id" value={groupHuntId} />
          <input type="hidden" name="is_public" value={initialIsPublic ? "false" : "true"} />
          <button className={`${initialIsPublic ? "button-secondary" : "button-primary"} w-full lg:w-auto`} type="submit">
            {initialIsPublic ? "Turn group sharing off" : "Publish group result"}
          </button>
        </form>
      </div>

      {initialIsPublic && shareUrl ? (
        <div className="mt-5 rounded-[1.4rem] border border-[rgba(53,37,30,0.1)] bg-[rgba(255,255,255,0.55)] p-4">
          <p className="eyebrow">Public Group Link</p>
          <p className="body-copy mt-2 break-all text-sm">{shareUrl}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <ShareLinkButton
              url={shareUrl}
              title={`Color Hunt Group Result · ${location}`}
              text={`A finished Color Hunt group board from ${location}. Compare every color story in one place.`}
              buttonLabel="Share group result"
              buttonDescription="Send the combined group artifact from your phone’s native share sheet"
              eventName="group_result_shared_native"
              metadata={{
                groupHuntId,
              }}
              className="button-primary w-full sm:w-auto"
            />
            <a className="button-secondary w-full sm:w-auto" href={shareUrl} target="_blank" rel="noreferrer">
              View public result
            </a>
          </div>
        </div>
      ) : null}
    </section>
  );
}
