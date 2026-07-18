"use client";

import { useMemo, useState } from "react";
import { AnalyticsHiddenFields } from "@/components/analytics/analytics-hidden-fields";
import { CoverPosterPreview } from "@/components/covers/cover-poster-preview";
import { trackEvent } from "@/lib/analytics";
import { getCoverTemplate, type CoverTemplateId } from "@/lib/covers";

type NewCoverBuilderProps = {
  createAction: (formData: FormData) => void | Promise<void>;
  templateId: CoverTemplateId;
};

export function NewCoverBuilder({ createAction, templateId }: NewCoverBuilderProps) {
  const [title, setTitle] = useState("");
  const [photoCount, setPhotoCount] = useState<4 | 6>(4);
  const activeTemplate = useMemo(() => getCoverTemplate(templateId), [templateId]);

  return (
    <form action={createAction} className="mt-8 grid gap-6">
      <AnalyticsHiddenFields />
      <input type="hidden" name="cover_template" value={templateId} />
      <input type="hidden" name="image_count" value={photoCount} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="cover-start-preview">
          <CoverPosterPreview
            templateId={templateId}
            photos={Array.from({ length: photoCount }, () => null)}
            title={title || activeTemplate.label}
          />
        </div>

        <div className="grid gap-5">
          <div>
            <p className="eyebrow">Template selected</p>
            <h2 className="panel-title mt-2 text-2xl font-semibold">{activeTemplate.label}</h2>
            <p className="body-copy mt-3 text-sm sm:text-base">
              Choose how much of the moment you want to tell. We will open the matching empty layout, then you can add all of the photos in one go.
            </p>
          </div>

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

          <div>
            <label className="field-label" htmlFor="cover-title">
              Cover title
            </label>
            <input
              id="cover-title"
              name="title"
              className="field-input"
              placeholder={activeTemplate.label}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="rounded-[1.6rem] border border-[rgba(47,97,223,0.12)] bg-[rgba(255,255,255,0.58)] p-4 sm:p-5">
            <p className="eyebrow">How it works</p>
            <ol className="mt-3 grid gap-2 text-sm text-[var(--muted-strong)]">
              <li>1. Pick four or six frames.</li>
              <li>2. Add the photos in one go.</li>
              <li>3. Adjust crops only if needed.</li>
              <li>4. Save and share the finished cover.</li>
            </ol>
          </div>

          <button
            className="button-primary w-full sm:w-auto"
            type="submit"
            onClick={() =>
              trackEvent({
                eventName: "cover_template_started",
                metadata: {
                  templateId,
                },
              })
            }
          >
            Add {photoCount} photos
          </button>
        </div>
      </div>
    </form>
  );
}
