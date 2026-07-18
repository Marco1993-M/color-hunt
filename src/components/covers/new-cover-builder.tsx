"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnalyticsHiddenFields } from "@/components/analytics/analytics-hidden-fields";
import { CoverPosterPreview } from "@/components/covers/cover-poster-preview";
import { trackEvent } from "@/lib/analytics";
import { getCoverTemplate, maxCustomCoverTitleLength, maxCustomCoverTitleLineLength, type CoverTemplateId } from "@/lib/covers";

type NewCoverBuilderProps = {
  createAction: (formData: FormData) => Promise<{ tripId: string; missionId: string }>;
  templateId: CoverTemplateId;
};

export function NewCoverBuilder({ createAction, templateId }: NewCoverBuilderProps) {
  const router = useRouter();
  const [photoCount, setPhotoCount] = useState<4 | 6>(4);
  const [title, setTitle] = useState("");
  const [secondTitleLine, setSecondTitleLine] = useState("");
  const [titleLayout, setTitleLayout] = useState<"purple" | "purple-stacked">("purple");
  const [isCreating, startTransition] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);
  const activeTemplate = useMemo(() => getCoverTemplate(templateId), [templateId]);
  const isCustomTitle = Boolean(activeTemplate.isCustomTitle);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setCreateError(null);

    startTransition(async () => {
      try {
        const draft = await createAction(formData);
        router.replace(`/covers/${templateId}/new?draft=${draft.tripId}`);
      } catch (error) {
        setCreateError(error instanceof Error ? error.message : "We could not start this cover. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
      <AnalyticsHiddenFields />
      <input type="hidden" name="cover_template" value={templateId} />
      <input type="hidden" name="image_count" value={photoCount} />
      <input type="hidden" name="title_style" value={isCustomTitle ? titleLayout : "default"} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
        <div className="order-1 glass-panel rounded-[2rem] p-5 sm:p-7 lg:order-2">
          <div>
            <p className="eyebrow">{isCustomTitle ? "Create your own" : activeTemplate.label}</p>
            <h1 className="panel-title mt-2 text-3xl font-semibold">How much of the moment?</h1>
            <p className="body-copy mt-3 text-sm sm:text-base">
              {isCustomTitle
                ? "Give it a short title, then choose a tighter edit or a fuller story."
                : "Pick a tighter edit or a fuller story. The template artwork stays exactly as designed."}
            </p>
          </div>

          {isCustomTitle ? (
            <div>
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

          <fieldset>
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

          <button
            className="button-primary mt-5 w-full"
            type="submit"
            disabled={isCreating}
            onClick={() =>
              trackEvent({
                eventName: "cover_template_started",
                metadata: {
                  templateId,
                },
              })
            }
          >
            {isCreating ? "Opening your photo slots..." : `Add ${photoCount} photos`}
          </button>
          {createError ? <p className="mt-3 text-sm text-[var(--brand-coral)]">{createError}</p> : null}
          <p className="mt-3 text-center text-xs text-[var(--muted)]">Next: choose the photos from your camera roll.</p>
        </div>

        <div className="cover-start-preview order-2 mx-auto w-full max-w-[19rem] lg:order-1 lg:max-w-none">
          <CoverPosterPreview
            templateId={templateId}
            photos={Array.from({ length: photoCount }, () => null)}
            title={isCustomTitle ? titleLayout === "purple-stacked" ? `${title || "YOUR"}\n${secondTitleLine || "TITLE"}` : title || "YOUR TITLE" : activeTemplate.label}
            titleStyle={isCustomTitle ? titleLayout : "default"}
          />
        </div>
      </div>
    </form>
  );
}
