"use client";

import Link from "next/link";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

type PublicPosterEventsProps = {
  shareId: string;
};

export function PublicPosterEvents({ shareId }: PublicPosterEventsProps) {
  useEffect(() => {
    trackEvent({
      eventName: "public_poster_viewed",
      shareId,
    });
  }, [shareId]);

  return null;
}

export function PublicPosterCtaLink({ shareId }: PublicPosterEventsProps) {
  return (
    <Link
      href="/"
      className="button-secondary w-full sm:w-auto"
      onClick={() =>
        trackEvent({
          eventName: "public_poster_cta_clicked",
          shareId,
        })
      }
    >
      Start your own color hunt
    </Link>
  );
}
