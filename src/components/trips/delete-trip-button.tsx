"use client";

import { useState } from "react";
import { deleteTripAction } from "@/app/actions";
import { AnalyticsHiddenFields } from "@/components/analytics/analytics-hidden-fields";

type DeleteTripButtonProps = {
  tripId: string;
  tripTitle: string;
};

export function DeleteTripButton({ tripId, tripTitle }: DeleteTripButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      action={deleteTripAction}
      className="w-full sm:w-auto"
      onSubmit={(event) => {
        const confirmed = window.confirm(`Delete "${tripTitle}"?\n\nThis removes the hunt, its photos, and cached posters.`);

        if (!confirmed) {
          event.preventDefault();
          return;
        }

        setIsSubmitting(true);
      }}
    >
      <AnalyticsHiddenFields />
      <input type="hidden" name="trip_id" value={tripId} />
      <button
        className="w-full rounded-full border border-[rgba(166,58,58,0.18)] bg-[rgba(255,246,246,0.92)] px-5 py-3 text-sm font-semibold text-[#a63a3a] transition hover:bg-[rgba(255,240,240,0.98)] sm:w-auto"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Deleting hunt..." : "Delete hunt"}
      </button>
    </form>
  );
}
