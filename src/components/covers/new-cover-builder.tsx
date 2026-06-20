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
  const activeTemplate = useMemo(() => getCoverTemplate(templateId), [templateId]);

  return (
    <form action={createAction} className="mt-8 grid gap-6">
      <AnalyticsHiddenFields />
      <input type="hidden" name="cover_template" value={templateId} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="cover-start-preview">
          <CoverPosterPreview
            templateId={templateId}
            photos={[null, null, null, null]}
            title={title || activeTemplate.label}
          />
        </div>

        <div className="grid gap-5">
          <div>
            <p className="eyebrow">Template selected</p>
            <h2 className="panel-title mt-2 text-2xl font-semibold">{activeTemplate.label}</h2>
            <p className="body-copy mt-3 text-sm sm:text-base">
              You’ll open the empty layout first, then tap the <span className="font-semibold text-[var(--ink)]">+</span> sign inside each photo spot to fill it intentionally.
            </p>
          </div>

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
              <li>1. Start this template.</li>
              <li>2. Tap each empty slot on the layout.</li>
              <li>3. Add one photo to that exact position.</li>
              <li>4. Adjust crops if needed, then export.</li>
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
            Start this template
          </button>
        </div>
      </div>
    </form>
  );
}
