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

type PublicPosterCtaLinkProps = PublicPosterEventsProps & {
  href: string;
  label: string;
};

export function PublicPosterCtaLink({ shareId, href, label }: PublicPosterCtaLinkProps) {
  return (
    <Link
      href={href}
      className="button-secondary w-full sm:w-auto"
      onClick={() =>
        trackEvent({
          eventName: "public_poster_cta_clicked",
          shareId,
        })
      }
    >
      {label}
    </Link>
  );
}
