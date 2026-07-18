"use client";

import { useState } from "react";
import { updateTripTitleAction } from "@/app/actions";
import { AnalyticsHiddenFields } from "@/components/analytics/analytics-hidden-fields";
import { maxCustomCoverTitleLength, maxCustomCoverTitleLineLength } from "@/lib/covers";

type EditTripTitleFormProps = {
  tripId: string;
  currentTitle: string;
  location: string;
  titleStyle?: "default" | "purple" | "purple-stacked" | null;
  showCustomFont?: boolean;
  compact?: boolean;
};

export function EditTripTitleForm({ tripId, currentTitle, location, titleStyle = "default", showCustomFont = false, compact = false }: EditTripTitleFormProps) {
  const [customStyle, setCustomStyle] = useState<"purple" | "purple-stacked">(titleStyle === "purple-stacked" ? "purple-stacked" : "purple");
  const [firstLine, secondLine = ""] = currentTitle.split("\n", 2);
  const isStacked = showCustomFont && customStyle === "purple-stacked";

  return (
    <form
      action={updateTripTitleAction}
      className={compact ? "grid gap-3 rounded-[1.4rem] border border-[var(--border)] bg-white/60 p-4" : "grid gap-3"}
    >
      <AnalyticsHiddenFields />
      <input type="hidden" name="trip_id" value={tripId} />
      <div>
        <label className="field-label" htmlFor={`trip-title-${tripId}`}>
          Poster title
        </label>
        <input
          id={`trip-title-${tripId}`}
          name="title"
          className="field-input"
          defaultValue={showCustomFont ? firstLine : currentTitle}
          placeholder={location}
          maxLength={showCustomFont ? isStacked ? maxCustomCoverTitleLineLength : maxCustomCoverTitleLength : undefined}
          required
        />
      </div>
      {showCustomFont ? (
        <div>
          <label className="field-label" htmlFor={`trip-title-style-${tripId}`}>
            Custom font
          </label>
          <select id={`trip-title-style-${tripId}`} name="title_style" className="field-input" value={customStyle} onChange={(event) => setCustomStyle(event.target.value as "purple" | "purple-stacked")}>
            <option value="purple">Purple illustrated · one line</option>
            <option value="purple-stacked">Purple illustrated · two lines</option>
          </select>
          {isStacked ? <input name="title_line_two" className="field-input mt-3" defaultValue={secondLine} placeholder="Second line" maxLength={maxCustomCoverTitleLineLength} required /> : null}
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{isStacked ? `Up to ${maxCustomCoverTitleLineLength} characters per line.` : `Up to ${maxCustomCoverTitleLength} characters, including spaces.`} The title stays centred in the canvas.</p>
        </div>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--muted)]">Update the title here and every poster format will use it.</p>
        <button type="submit" className="button-secondary w-full sm:w-auto">
          Save title
        </button>
      </div>
    </form>
  );
}
