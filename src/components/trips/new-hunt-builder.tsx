"use client";

import { useMemo, useState, useTransition } from "react";
import { getPhotoSlots } from "@/lib/photo-slots";
import Link from "next/link";
import { CoverSlotBuilder } from "@/components/covers/cover-slot-builder";
import { SocialUpgradePanel } from "@/components/auth/social-upgrade-panel";
import { EditTripTitleForm } from "@/components/trips/edit-trip-title-form";
import { SaveImageButton } from "@/components/trips/save-image-button";
import { getAnalyticsIds, trackEvent } from "@/lib/analytics";
import { getPhotoUrl } from "@/lib/photo-url";
import { getPosterPhotoPlacement } from "@/lib/poster";
import type { MissionSeed } from "@/lib/missions";
import type { Photo } from "@/lib/types";

const huntHints = [
  "Look for your color in a reflection.",
  "Find it somewhere tiny, like a button or a sticker.",
  "Look for it on a sign, painted door, or shop window.",
  "See if you can find it somewhere in nature.",
];

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
  challengeColor?: string;
  challengeTitle?: string;
  challengeLocation?: string;
};

export function NewHuntBuilder({ createAction, missionSeeds, userId, bucketName, isGuest = false, initialDraft = null, challengeColor = "", challengeTitle = "", challengeLocation = "" }: NewHuntBuilderProps) {
  const [selectedColor, setSelectedColor] = useState(initialDraft?.colorName ?? (challengeColor || missionSeeds[0]?.color_name) ?? "random");
  const [draft, setDraft] = useState<HuntDraft | null>(initialDraft);
  const [hintIndex, setHintIndex] = useState(-1);
  const [hasSavedOutput, setHasSavedOutput] = useState(false);
  const [isCreating, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const mission = useMemo(
    () => missionSeeds.find((entry) => entry.color_name === selectedColor) ?? missionSeeds[0],
    [missionSeeds, selectedColor],
  );
  const validPhotos = getPhotoSlots(draft?.photos ?? [], 9).filter((photo): photo is Photo => Boolean(photo));
  const isComplete = validPhotos.length === 9;
  const posterData = draft ? {
    posterTitle: draft.title,
    locationLabel: draft.location,
    location: draft.location,
    missionColorName: draft.colorName,
    tripYear: String(new Date().getFullYear()),
    posterTone: draft.colorHex,
    photoUrls: validPhotos.map(getPhotoUrl),
    photoPlacements: validPhotos.map(getPosterPhotoPlacement),
    photoFilters: validPhotos.map((photo) => photo.photo_filter ?? "none"),
  } : null;

  const [previousDraft, setPreviousDraft] = useState(initialDraft);
  if (previousDraft !== initialDraft) {
    setPreviousDraft(initialDraft);
    setDraft(initialDraft);
    setHasSavedOutput(false);
    if (initialDraft) {
      setSelectedColor(initialDraft.colorName);
    }
  }

  function startHunt() {
    if (!mission) {
      setError("Choose a color to begin.");
      return;
    }

    const formData = new FormData();
    const { sessionId, journeyId } = getAnalyticsIds();
    formData.set("color_name", mission.color_name);
    formData.set("title", challengeTitle);
    formData.set("location", challengeLocation);
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

  if (draft) {
    return (
      <div className="mx-auto max-w-xl rounded-[2rem] bg-white/90 p-4 shadow-sm sm:p-7">
        <header className="mb-4">
          <p className="eyebrow flex items-center gap-2">
            <span aria-hidden="true" className="h-5 w-5 rounded-full border border-black/20" style={{ backgroundColor: draft.colorHex }} />
            {draft.colorName} Hunt
          </p>
          <h1 className="panel-title mt-2 text-2xl font-semibold">{isComplete ? "You found all nine!" : `Look for ${draft.colorName.toLowerCase()}`}</h1>
          {isComplete ? <p className="body-copy mt-2">Your collection is ready. Give it a name and share your hunt.</p> : (
            <div className="mt-3">
              <button type="button" className="min-h-11 text-sm font-semibold underline underline-offset-4" onClick={() => setHintIndex((hintIndex + 1) % huntHints.length)}>
                {hintIndex < 0 ? "Need an idea?" : "Another idea"}
              </button>
              <p className="text-sm text-[var(--muted)]" aria-live="polite">{huntHints[hintIndex]}</p>
            </div>
          )}
        </header>
        {isComplete ? <div className="mb-3 text-center"><p className="font-serif text-3xl" style={{ color: draft.colorHex }}>{draft.title}</p><p className="mt-1 text-sm">{draft.location}</p></div> : null}
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
        {isComplete ? (
          <div className="mt-5">
                  <details className="mt-5">
                    <summary className="cursor-pointer text-sm font-semibold">Edit poster title and place</summary>
                    <div className="mt-3">
                      <EditTripTitleForm key={JSON.stringify([draft.tripId, draft.title, draft.location])} tripId={draft.tripId} currentTitle={draft.title} location={draft.location} editLocation compact />
                    </div>
                  </details>
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
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-2 lg:items-center">
      <div className="glass-panel rounded-[2rem] p-5 sm:p-7">
            <>
              <p className="eyebrow">Start a Color Hunt</p>
              <h1 className="panel-title mt-2 text-3xl font-semibold">Pick your color.</h1>
              <p className="body-copy mt-3 text-sm sm:text-base">Choose a color and find nine things that match. You can name your poster when you finish.</p>
              <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {missionSeeds.map((seed) => {
                  const isSelected = seed.color_name === mission?.color_name;
                  return <button key={seed.color_name} type="button" onClick={() => setSelectedColor(seed.color_name)} aria-pressed={isSelected} className={`rounded-[1rem] border p-3 text-left transition ${isSelected ? "border-[#2f61df] ring-2 ring-[#2f61df] bg-white shadow-[0_10px_24px_rgba(47,97,223,0.12)]" : "border-[rgba(53,37,30,0.08)] bg-white/55"}`}>
                    <span className="mb-3 block h-7 w-7 rounded-full border border-black/10" style={{ backgroundColor: seed.color_hex }} />
                    <span className="block text-xs font-bold text-[var(--foreground)]">{seed.color_name}{isSelected ? <span aria-hidden="true" className="ml-2">✓</span> : null}</span>
                  </button>;
                })}
              </div>
              <div className="mt-4 rounded-[1.35rem] border border-[rgba(53,37,30,0.08)] bg-white/60 p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">{mission?.color_name}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{mission?.prompt}</p>
              </div>
              <button type="button" className="button-primary mt-5 w-full" disabled={isCreating} onClick={() => { trackEvent({ eventName: "hunt_color_selected", metadata: { colorName: mission?.color_name } }); startHunt(); }}>
                {isCreating ? "Opening your nine frames..." : `Start the ${mission?.color_name} Hunt`}
              </button>
              <Link href="/trips/new?mode=group" className="mt-4 block text-center text-sm font-semibold text-[var(--muted)]">Planning a group hunt instead? →</Link>
              {error ? <p className="mt-3 text-sm text-[var(--brand-coral)]">{error}</p> : null}
            </>
      </div>
      <div className="mx-auto hidden w-full max-w-md lg:block">
            <div className="cover-preview-shell hunt-slot-shell">
              <div className="grid h-full grid-cols-3 grid-rows-3">
                {Array.from({ length: 9 }, (_, index) => <div key={index} className="flex items-center justify-center border border-white/60" style={{ backgroundColor: `${mission?.color_hex ?? "#2F80ED"}${index % 2 ? "18" : "30"}` }}><span className="text-xs font-bold uppercase tracking-[0.14em] text-[rgba(31,25,52,0.5)]">{index + 1}</span></div>)}
              </div>
              <div className="absolute inset-x-4 bottom-4 rounded-[1.2rem] bg-white/92 p-4 text-center shadow-[0_12px_30px_rgba(31,25,52,0.12)]">
                <p className="eyebrow">{mission?.color_name} mission</p>
                <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">Nine small reasons to look again.</p>
              </div>
            </div>
      </div>
    </div>
  );
}
