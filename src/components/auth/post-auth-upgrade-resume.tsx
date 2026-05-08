"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isAnonymousUser } from "@/lib/user-state";

const UPGRADE_CONTEXT_KEY = "colorhunt-upgrade-context";

function readUpgradeContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const fromSession = window.sessionStorage.getItem(UPGRADE_CONTEXT_KEY);

  if (fromSession) {
    try {
      return JSON.parse(fromSession) as {
        nextPath?: string;
        tripId?: string;
        guestUserId?: string;
      };
    } catch {
      // Fall through to cookie parsing.
    }
  }

  const cookieValue = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${UPGRADE_CONTEXT_KEY}=`))
    ?.split("=")[1];

  if (!cookieValue) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(cookieValue)) as {
      nextPath?: string;
      tripId?: string;
      guestUserId?: string;
    };
  } catch {
    return null;
  }
}

function clearUpgradeContext() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(UPGRADE_CONTEXT_KEY);
  document.cookie = `${UPGRADE_CONTEXT_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

export function PostAuthUpgradeResume() {
  const router = useRouter();

  useEffect(() => {
    let isActive = true;
    const supabase = createClient();

    async function resumeUpgrade() {
      const context = readUpgradeContext();

      if (!context?.tripId || !context.guestUserId) {
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isActive || !user || isAnonymousUser(user)) {
        return;
      }

      const response = await fetch("/api/trips/claim-guest", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          tripId: context.tripId,
          guestUserId: context.guestUserId,
        }),
      });

      if (!isActive) {
        return;
      }

      if (response.ok) {
        clearUpgradeContext();
        router.replace(context.nextPath || `/trips/${context.tripId}/poster`);
        router.refresh();
      }
    }

    void resumeUpgrade();

    return () => {
      isActive = false;
    };
  }, [router]);

  return null;
}
