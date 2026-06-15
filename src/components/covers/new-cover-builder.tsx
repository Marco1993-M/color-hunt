"use client";

import { useMemo, useState } from "react";
import { AnalyticsHiddenFields } from "@/components/analytics/analytics-hidden-fields";
import { trackEvent } from "@/lib/analytics";
import { coverTemplates, getCoverTemplate, type CoverTemplateId } from "@/lib/covers";

type NewCoverBuilderProps = {
  createAction: (formData: FormData) => void | Promise<void>;
};

export function NewCoverBuilder({ createAction }: NewCoverBuilderProps) {
  const [templateId, setTemplateId] = useState<CoverTemplateId>("july");
  const [title, setTitle] = useState("");
  const activeTemplate = useMemo(() => getCoverTemplate(templateId), [templateId]);

  return (
    <form action={createAction} className="mt-8 grid gap-5">
      <AnalyticsHiddenFields />
      <input type="hidden" name="cover_template" value={templateId} />

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

      <div className="rounded-[1.6rem] border border-[rgba(53,37,30,0.1)] bg-[rgba(255,255,255,0.58)] p-4 sm:p-5">
        <p className="eyebrow">Choose a cover</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {coverTemplates.map((template) => {
            const isActive = template.id === templateId;

            return (
              <button
                key={template.id}
                type="button"
                className={`rounded-[1.25rem] border p-4 text-left transition ${
                  isActive
                    ? "border-[rgba(47,97,223,0.24)] bg-[rgba(47,97,223,0.08)]"
                    : "border-[rgba(53,37,30,0.08)] bg-white/70"
                }`}
                onClick={() => {
                  setTemplateId(template.id);
                  trackEvent({
                    eventName: "cover_template_selected",
                    metadata: {
                      templateId: template.id,
                    },
                  });
                }}
              >
                <p className="text-lg font-semibold text-[var(--ink)]">{template.label}</p>
                <p className="body-copy mt-2 text-sm">{template.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[1.6rem] border border-[rgba(47,97,223,0.12)] bg-[rgba(255,255,255,0.58)] p-4 sm:p-5">
        <p className="eyebrow">How it works</p>
        <p className="body-copy mt-2 text-sm sm:text-base">
          Pick a template, upload four photos, and export a cover without going through the nine-frame hunt flow.
        </p>
      </div>

      <button className="button-primary w-full sm:w-auto" type="submit">
        Start this cover
      </button>
    </form>
  );
}

