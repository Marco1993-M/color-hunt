"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { updateTripTitleAction } from "@/app/actions";
import { AnalyticsHiddenFields } from "@/components/analytics/analytics-hidden-fields";
import { CoverPosterPreview } from "@/components/covers/cover-poster-preview";
import { CoverSlotBuilder } from "@/components/covers/cover-slot-builder";
import { SaveImageButton } from "@/components/trips/save-image-button";
import { SocialUpgradePanel } from "@/components/auth/social-upgrade-panel";
import { trackEvent } from "@/lib/analytics";
import { getCoverTemplate, maxCustomCoverTitleLength, maxCustomCoverTitleLineLength, type CoverTemplateId } from "@/lib/covers";
import { getPhotoUrl } from "@/lib/photo-url";
import { getPosterPhotoPlacement } from "@/lib/poster";
import type { Photo } from "@/lib/types";

type CoverDraft = {
  tripId: string;
  missionId: string;
  title: string;
  titleStyle: "default" | "purple" | "purple-stacked" | null | undefined;
  photos: Photo[];
  maxPhotos: number;
};

type NewCoverBuilderProps = {
  createAction: (formData: FormData) => Promise<{ tripId: string; missionId: string }>;
  templateId: CoverTemplateId;
  userId: string;
  bucketName: string;
  isGuest?: boolean;
  initialDraft?: CoverDraft | null;
};

export function NewCoverBuilder({ createAction, templateId, userId, bucketName, isGuest = false, initialDraft = null }: NewCoverBuilderProps) {
  const [photoCount, setPhotoCount] = useState<4 | 6>(4);
  const [title, setTitle] = useState("");
  const [secondTitleLine, setSecondTitleLine] = useState("");
  const [titleLayout, setTitleLayout] = useState<"purple" | "purple-stacked">("purple");
  const [isCreating, startTransition] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);
  const [draft, setDraft] = useState<CoverDraft | null>(initialDraft);
  const activeTemplate = useMemo(() => getCoverTemplate(templateId), [templateId]);
  const isCustomTitle = Boolean(activeTemplate.isCustomTitle);
  const isDraftComplete = Boolean(draft && draft.photos.length >= draft.maxPhotos);
  const posterData = draft ? {
    posterTitle: draft.title,
    locationLabel: activeTemplate.label,
    location: activeTemplate.label,
    missionColorName: activeTemplate.label,
    tripYear: String(new Date().getFullYear()),
    posterTone: "#2d224a",
    photoUrls: draft.photos.map(getPhotoUrl),
    photoPlacements: draft.photos.map(getPosterPhotoPlacement),
  } : null;

  useEffect(() => {
    setDraft(initialDraft);
    if (initialDraft?.title) {
      const [firstLine, secondLine = ""] = initialDraft.title.split("\n", 2);
      setTitle(firstLine);
      setSecondTitleLine(secondLine);
      setTitleLayout(initialDraft.titleStyle === "purple-stacked" ? "purple-stacked" : "purple");
    }
  }, [initialDraft]);

  function saveCustomTitle() {
    if (!draft || !title.trim()) {
      setCreateError("Add a title before saving it.");
      return;
    }

    if (titleLayout === "purple-stacked" && !secondTitleLine.trim()) {
      setCreateError("Add both title lines before saving.");
      return;
    }

    const formData = new FormData();
    formData.set("trip_id", draft.tripId);
    formData.set("cover_template", templateId);
    formData.set("title", title);
    formData.set("title_style", titleLayout);
    formData.set("title_line_two", secondTitleLine);
    setCreateError(null);

    startTransition(async () => {
      try {
        await updateTripTitleAction(formData);
        const nextTitle = titleLayout === "purple-stacked" ? `${title.trim()}\n${secondTitleLine.trim()}` : title.trim();
        setDraft((current) => current ? { ...current, title: nextTitle, titleStyle: titleLayout } : current);
      } catch (error) {
        setCreateError(error instanceof Error ? error.message : "We could not save that title. Please try again.");
      }
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setCreateError(null);

    startTransition(async () => {
      try {
        const createdDraft = await createAction(formData);
        const draftTitle = titleLayout === "purple-stacked" ? `${title}\n${secondTitleLine}` : title;
        setDraft({
          tripId: createdDraft.tripId,
          missionId: createdDraft.missionId,
          title: draftTitle,
          titleStyle: isCustomTitle ? titleLayout : "default",
          photos: [],
          maxPhotos: photoCount,
        });
        window.history.replaceState(null, "", `/covers/${templateId}/new?draft=${createdDraft.tripId}`);
      } catch (error) {
        setCreateError(error instanceof Error ? error.message : "We could not start this cover. Please try again.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
    <form onSubmit={handleSubmit}>
      <AnalyticsHiddenFields />
      <input type="hidden" name="cover_template" value={templateId} />
      <input type="hidden" name="image_count" value={photoCount} />
      <input type="hidden" name="title_style" value={isCustomTitle ? titleLayout : "default"} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
        <div className={`${draft ? "order-2 is-locked" : "order-1"} cover-creator-setup glass-panel rounded-[2rem] p-5 sm:p-7 lg:order-2`}>
          <div className="cover-creator-intro">
            <p className="eyebrow">{isCustomTitle ? "Create your own" : activeTemplate.label}</p>
            <h1 className="panel-title mt-2 text-3xl font-semibold">How much of the moment?</h1>
            <p className="body-copy mt-3 text-sm sm:text-base">
              {isCustomTitle
                ? "Give it a short title, then choose a tighter edit or a fuller story."
                : "Pick a tighter edit or a fuller story. The template artwork stays exactly as designed."}
            </p>
          </div>

          {isCustomTitle ? (
            <div className="cover-creator-title-controls">
              <label className="field-label">Title layout</label>
              <div className="grid grid-cols-2 gap-3">
                {(["purple", "purple-stacked"] as const).map((layout) => (
                  <button key={layout} type="button" className={`rounded-[1rem] border px-3 py-3 text-left text-sm font-semibold ${titleLayout === layout ? "border-[rgba(47,97,223,0.52)] bg-[rgba(225,235,255,0.74)]" : "border-[rgba(53,37,30,0.1)] bg-white/55"}`} onClick={() => setTitleLayout(layout)}>
                    {layout === "purple" ? "One line" : "Two lines"}
                  </button>
                ))}
              </div>
              <label className="field-label" htmlFor="custom-cover-title">Your title</label>
              <input
                id="custom-cover-title"
                name="title"
                className="field-input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={titleLayout === "purple-stacked" ? "Cape Town" : "Summer sun"}
                maxLength={titleLayout === "purple-stacked" ? maxCustomCoverTitleLineLength : maxCustomCoverTitleLength}
                required
              />
              {titleLayout === "purple-stacked" ? <input name="title_line_two" className="field-input mt-3" value={secondTitleLine} onChange={(event) => setSecondTitleLine(event.target.value)} placeholder="Weekend" maxLength={maxCustomCoverTitleLineLength} required /> : null}
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{titleLayout === "purple-stacked" ? `Up to ${maxCustomCoverTitleLineLength} characters per line.` : `Up to ${maxCustomCoverTitleLength} characters, including spaces.`} The title stays centred in the canvas.</p>
            </div>
          ) : null}

          <fieldset className="cover-creator-photo-controls">
            <legend className="field-label">How many photos?</legend>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {[4, 6].map((count) => (
                <button
                  key={count}
                  className={`rounded-[1.2rem] border px-4 py-4 text-left transition ${photoCount === count ? "border-[rgba(47,97,223,0.52)] bg-[rgba(225,235,255,0.74)] shadow-[0_10px_24px_rgba(47,97,223,0.1)]" : "border-[rgba(53,37,30,0.1)] bg-white/55"}`}
                  type="button"
                  aria-pressed={photoCount === count}
                  onClick={() => setPhotoCount(count as 4 | 6)}
                >
                  <span className="block text-lg font-bold text-[var(--foreground)]">{count} photos</span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
                    {count === 4 ? "A tighter, bolder edit" : "A fuller photo story"}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          {draft ? (
            <div className="cover-creator-progress mt-1">
              <span>{draft.photos.length}/{draft.maxPhotos} ready</span>
              <i style={{ width: `${Math.min((draft.photos.length / draft.maxPhotos) * 100, 100)}%` }} />
            </div>
          ) : null}
          {draft && isCustomTitle ? (
            <div className="cover-creator-title-edit mt-4">
              <p className="field-label">Edit title</p>
              <div className="grid grid-cols-2 gap-2">
                {(["purple", "purple-stacked"] as const).map((layout) => (
                  <button key={`edit-${layout}`} type="button" className={`rounded-[0.9rem] border px-3 py-2 text-sm font-semibold ${titleLayout === layout ? "border-[rgba(47,97,223,0.52)] bg-[rgba(225,235,255,0.74)]" : "border-[rgba(53,37,30,0.1)] bg-white/55"}`} onClick={() => setTitleLayout(layout)}>
                    {layout === "purple" ? "One line" : "Two lines"}
                  </button>
                ))}
              </div>
              <input className="field-input mt-2" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={titleLayout === "purple-stacked" ? maxCustomCoverTitleLineLength : maxCustomCoverTitleLength} aria-label="Cover title" />
              {titleLayout === "purple-stacked" ? <input className="field-input mt-2" value={secondTitleLine} onChange={(event) => setSecondTitleLine(event.target.value)} maxLength={maxCustomCoverTitleLineLength} aria-label="Cover title second line" /> : null}
              <button type="button" className="button-secondary mt-2 w-full" disabled={isCreating} onClick={saveCustomTitle}>
                {isCreating ? "Saving title..." : "Save title"}
              </button>
            </div>
          ) : null}
          {draft ? isDraftComplete ? (
            <>
              <SaveImageButton
                posterData={posterData}
                layoutSourceId="cover-builder-export"
                fileName={`${draft.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "cover"}.png`}
                tripId={draft.tripId}
                buttonLabel="Save & share cover"
                className="button-primary mt-5 w-full"
              />
              {isGuest ? <div className="mt-5"><SocialUpgradePanel tripId={draft.tripId} nextPath={`/covers/${templateId}/new?draft=${draft.tripId}`} /></div> : null}
            </>
          ) : <p className="mt-5 text-center text-sm font-semibold text-[var(--muted)]">Tap a <strong>+</strong> on the cover to add each photo.</p> : (
            <button
              className="button-primary mt-5 w-full"
              type="submit"
              disabled={isCreating}
              onClick={() => trackEvent({ eventName: "cover_template_started", metadata: { templateId } })}
            >
              {isCreating ? "Opening your photo slots..." : `Add ${photoCount} photos`}
            </button>
          )}
          {createError ? <p className="mt-3 text-sm text-[var(--brand-coral)]">{createError}</p> : null}
          <p className="cover-creator-next-copy mt-3 text-center text-xs text-[var(--muted)]">Next: choose the photos from your camera roll.</p>
        </div>

        <div className={`${draft ? "order-1 is-active" : "order-2"} cover-start-preview mx-auto w-full max-w-[19rem] lg:order-1 lg:max-w-none`}>
          {draft ? (
            <CoverSlotBuilder
              inline
              tripId={draft.tripId}
              missionId={draft.missionId}
              userId={userId}
              bucketName={bucketName}
              templateId={templateId}
              title={draft.title}
              titleStyle={draft.titleStyle}
              photos={draft.photos}
              maxPhotos={draft.maxPhotos}
              previewId="cover-builder-export"
            />
          ) : <CoverPosterPreview templateId={templateId} photos={Array.from({ length: photoCount }, () => null)} title={isCustomTitle ? titleLayout === "purple-stacked" ? `${title || "YOUR"}\n${secondTitleLine || "TITLE"}` : title || "YOUR TITLE" : activeTemplate.label} titleStyle={isCustomTitle ? titleLayout : "default"} />}
        </div>
      </div>
    </form>
    </div>
  );
}
