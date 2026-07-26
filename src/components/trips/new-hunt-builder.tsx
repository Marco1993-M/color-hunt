"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CoverSlotBuilder } from "@/components/covers/cover-slot-builder";
import { SocialUpgradePanel } from "@/components/auth/social-upgrade-panel";
import { SaveImageButton } from "@/components/trips/save-image-button";
import { getAnalyticsIds, trackEvent } from "@/lib/analytics";
import { getPhotoUrl } from "@/lib/photo-url";
import { getPosterPhotoPlacement } from "@/lib/poster";
import type { MissionSeed } from "@/lib/missions";
import type { Photo } from "@/lib/types";

type HuntDraft = {
  tripId: string;
  missionId: string;
  title: string;
  location: string;
  colorName: string;
  colorHex: string;
  prompt: string;
  photos: Photo[];
};

type NewHuntBuilderProps = {
  createAction: (formData: FormData) => Promise<{
    tripId: string;
    missionId: string;
    title: string;
    location: string;
    mission: MissionSeed;
  }>;
  missionSeeds: MissionSeed[];
  userId: string;
  bucketName: string;
  isGuest?: boolean;
  initialDraft?: HuntDraft | null;
};

export function NewHuntBuilder({ createAction, missionSeeds, userId, bucketName, isGuest = false, initialDraft = null }: NewHuntBuilderProps) {
  const [selectedColor, setSelectedColor] = useState(initialDraft?.colorName ?? missionSeeds[0]?.color_name ?? "random");
  const [title, setTitle] = useState(initialDraft?.title ?? "");
  const [location, setLocation] = useState(initialDraft?.location === "Everywhere" ? "" : initialDraft?.location ?? "");
  const [draft, setDraft] = useState<HuntDraft | null>(initialDraft);
  const [hasSavedOutput, setHasSavedOutput] = useState(false);
  const [isCreating, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const mission = useMemo(
    () => missionSeeds.find((entry) => entry.color_name === selectedColor) ?? missionSeeds[0],
    [missionSeeds, selectedColor],
  );
  const isComplete = Boolean(draft && draft.photos.length >= 9);
  const posterData = draft ? {
    posterTitle: draft.title,
    locationLabel: draft.location,
    location: draft.location,
    missionColorName: draft.colorName,
    tripYear: String(new Date().getFullYear()),
    posterTone: draft.colorHex,
    photoUrls: draft.photos.map(getPhotoUrl),
    photoPlacements: draft.photos.map(getPosterPhotoPlacement),
  } : null;

  useEffect(() => {
    setDraft(initialDraft);
    setHasSavedOutput(false);
    if (initialDraft) {
      setSelectedColor(initialDraft.colorName);
      setTitle(initialDraft.title);
      setLocation(initialDraft.location === "Everywhere" ? "" : initialDraft.location);
    }
  }, [initialDraft]);

  function startHunt() {
    if (!mission) {
      setError("Choose a color to begin.");
      return;
    }

    const formData = new FormData();
    const { sessionId, journeyId } = getAnalyticsIds();
    formData.set("color_name", mission.color_name);
    formData.set("title", title);
    formData.set("location", location);
    formData.set("analytics_session_id", sessionId);
    formData.set("analytics_journey_id", journeyId);
    setError(null);

    startTransition(async () => {
      try {
        const created = await createAction(formData);
        setDraft({
          tripId: created.tripId,
          missionId: created.missionId,
          title: created.title,
          location: created.location,
          colorName: created.mission.color_name,
          colorHex: created.mission.color_hex,
          prompt: created.mission.prompt,
          photos: [],
        });
        window.history.replaceState(null, "", `/trips/new?draft=${created.tripId}`);
      } catch (creationError) {
        setError(creationError instanceof Error ? creationError.message : "We could not start this hunt. Please try again.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
        <div className="order-2 glass-panel rounded-[2rem] p-5 sm:p-7 lg:order-2">
          {draft ? (
            <>
              <p className="eyebrow">Your {draft.colorName} Hunt</p>
              <h1 className="panel-title mt-2 text-3xl font-semibold">Nine frames. One point of view.</h1>
              <p className="body-copy mt-3 text-sm sm:text-base">{draft.prompt}</p>
              <div className="cover-creator-progress mt-5">
                <span>{draft.photos.length}/9 ready</span>
                <i style={{ width: `${Math.min((draft.photos.length / 9) * 100, 100)}%` }} />
              </div>
              {isComplete ? (
                <>
                  <SaveImageButton
                    posterData={posterData}
                    fileName={`${draft.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "color-hunt"}.png`}
                    tripId={draft.tripId}
                    buttonLabel="Save & share poster"
                    className="button-primary mt-5 w-full"
                    onSaved={() => setHasSavedOutput(true)}
                  />
                  {hasSavedOutput ? <div className="mt-5 space-y-3">
                    {isGuest ? <SocialUpgradePanel tripId={draft.tripId} nextPath={`/trips/new?draft=${draft.tripId}`} /> : null}
                    <Link href="/trips/new" className="button-secondary block w-full text-center">Turn another color into a poster</Link>
                  </div> : null}
                </>
              ) : (
                <p className="mt-5 text-center text-sm font-semibold text-[var(--muted)]">Tap a <strong>+</strong> to add each moment. Tap a photo to adjust its crop.</p>
              )}
            </>
          ) : (
            <>
              <p className="eyebrow">Start a Color Hunt</p>
              <h1 className="panel-title mt-2 text-3xl font-semibold">Pick the color that changes how you look.</h1>
              <p className="body-copy mt-3 text-sm sm:text-base">No trip form. No date fields. Choose one color, then build its story in nine frames.</p>
              <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {missionSeeds.map((seed) => {
                  const isSelected = seed.color_name === mission?.color_name;
                  return <button key={seed.color_name} type="button" onClick={() => setSelectedColor(seed.color_name)} aria-pressed={isSelected} className={`rounded-[1rem] border p-3 text-left transition ${isSelected ? "border-[rgba(47,97,223,0.55)] bg-white shadow-[0_10px_24px_rgba(47,97,223,0.12)]" : "border-[rgba(53,37,30,0.08)] bg-white/55"}`}>
                    <span className="mb-3 block h-7 w-7 rounded-full border border-black/10" style={{ backgroundColor: seed.color_hex }} />
                    <span className="block text-xs font-bold text-[var(--foreground)]">{seed.color_name}</span>
                  </button>;
                })}
              </div>
              <div className="mt-4 rounded-[1.35rem] border border-[rgba(53,37,30,0.08)] bg-white/60 p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">{mission?.color_name}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{mission?.prompt}</p>
              </div>
              <details className="mt-4 rounded-[1.35rem] border border-[rgba(53,37,30,0.08)] bg-white/45 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">Name it or leave it open</summary>
                <div className="mt-4 grid gap-3">
                  <input className="field-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`${mission?.color_name ?? "Color"} Hunt`} aria-label="Poster title" />
                  <input className="field-input" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Where are you looking? (optional)" aria-label="Location" />
                </div>
              </details>
              <button type="button" className="button-primary mt-5 w-full" disabled={isCreating} onClick={() => { trackEvent({ eventName: "hunt_color_selected", metadata: { colorName: mission?.color_name } }); startHunt(); }}>
                {isCreating ? "Opening your nine frames..." : `Start the ${mission?.color_name} Hunt`}
              </button>
              <Link href="/trips/new?mode=group" className="mt-4 block text-center text-sm font-semibold text-[var(--muted)]">Planning a group hunt instead? →</Link>
              {error ? <p className="mt-3 text-sm text-[var(--brand-coral)]">{error}</p> : null}
            </>
          )}
        </div>

        <div className="order-1 mx-auto w-full max-w-[23rem] lg:order-1 lg:max-w-none">
          {draft ? (
            <CoverSlotBuilder
              inline
              variant="hunt"
              tripId={draft.tripId}
              missionId={draft.missionId}
              userId={userId}
              bucketName={bucketName}
              templateId="hunt"
              title={draft.title}
              photos={draft.photos}
              maxPhotos={9}
            />
          ) : (
            <div className="cover-preview-shell hunt-slot-shell">
              <div className="grid h-full grid-cols-3 grid-rows-3">
                {Array.from({ length: 9 }, (_, index) => <div key={index} className="flex items-center justify-center border border-white/60" style={{ backgroundColor: `${mission?.color_hex ?? "#2F80ED"}${index % 2 ? "18" : "30"}` }}><span className="text-xs font-bold uppercase tracking-[0.14em] text-[rgba(31,25,52,0.5)]">{index + 1}</span></div>)}
              </div>
              <div className="absolute inset-x-4 bottom-4 rounded-[1.2rem] bg-white/92 p-4 text-center shadow-[0_12px_30px_rgba(31,25,52,0.12)]">
                <p className="eyebrow">{mission?.color_name} mission</p>
                <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">Nine small reasons to look again.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
