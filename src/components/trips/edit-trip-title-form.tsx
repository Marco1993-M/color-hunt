import { updateTripTitleAction } from "@/app/actions";
import { AnalyticsHiddenFields } from "@/components/analytics/analytics-hidden-fields";

type EditTripTitleFormProps = {
  tripId: string;
  currentTitle: string;
  location: string;
  compact?: boolean;
};

export function EditTripTitleForm({ tripId, currentTitle, location, compact = false }: EditTripTitleFormProps) {
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
          defaultValue={currentTitle}
          placeholder={location}
          required
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--muted)]">Update the title here and every poster format will use it.</p>
        <button type="submit" className="button-secondary w-full sm:w-auto">
          Save title
        </button>
      </div>
    </form>
  );
}
