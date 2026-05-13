"use client";

import { useState } from "react";
import { deleteGroupHuntAction } from "@/app/actions";

type DeleteGroupHuntButtonProps = {
  groupHuntId: string;
  groupHuntTitle: string;
};

export function DeleteGroupHuntButton({ groupHuntId, groupHuntTitle }: DeleteGroupHuntButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      action={deleteGroupHuntAction}
      className="w-full sm:w-auto"
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Delete "${groupHuntTitle}"?\n\nThis removes the group lobby, every participant hunt, all photos, and all cached posters.`,
        );

        if (!confirmed) {
          event.preventDefault();
          return;
        }

        setIsSubmitting(true);
      }}
    >
      <input type="hidden" name="group_hunt_id" value={groupHuntId} />
      <button
        className="w-full rounded-full border border-[rgba(166,58,58,0.18)] bg-[rgba(255,246,246,0.92)] px-5 py-3 text-sm font-semibold text-[#a63a3a] transition hover:bg-[rgba(255,240,240,0.98)] sm:w-auto"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Deleting group hunt..." : "Delete group hunt"}
      </button>
    </form>
  );
}
