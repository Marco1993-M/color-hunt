"use client";

import Link, { type LinkProps } from "next/link";
import { type MouseEventHandler, type ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";

type TrackedLinkProps = LinkProps & {
  children: ReactNode;
  className?: string;
  eventName: string;
  metadata?: Record<string, unknown>;
  tripId?: string | null;
  shareId?: string | null;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

export function TrackedLink({
  children,
  className,
  eventName,
  metadata = {},
  tripId = null,
  shareId = null,
  onClick,
  ...linkProps
}: TrackedLinkProps) {
  return (
    <Link
      {...linkProps}
      className={className}
      onClick={(event) => {
        onClick?.(event);

        if (event.defaultPrevented) {
          return;
        }

        trackEvent({
          eventName,
          tripId,
          shareId,
          metadata,
        });
      }}
    >
      {children}
    </Link>
  );
}
