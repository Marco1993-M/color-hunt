"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isAnonymousUser } from "@/lib/user-state";

type AuthFinishClientProps = {
  nextPath: string;
};

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

export function AuthFinishClient({ nextPath }: AuthFinishClientProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    let hasResolved = false;
    const supabase = createClient();

    async function finishSignIn() {
      if (hasResolved) {
        return;
      }

      hasResolved = true;
      const fallbackNextPath = nextPath;
      let resolvedNextPath = fallbackNextPath;

      if (typeof window !== "undefined") {
        const context = readUpgradeContext();

        if (context) {
          try {
            if (context.nextPath) {
              resolvedNextPath = context.nextPath;
            }

            if (context.tripId && context.guestUserId) {
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

              if (!response.ok) {
                const result = (await response.json()) as { error?: string };
                throw new Error(result.error || "We couldn't attach your guest poster.");
              }
            }

            clearUpgradeContext();
          } catch (finishFailure) {
            hasResolved = false;
            throw finishFailure;
          }
        }
      }

      window.location.replace(resolvedNextPath);
    }

    async function resolveUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isActive) {
        return;
      }

      if (user && !isAnonymousUser(user)) {
        try {
          await finishSignIn();
        } catch (finishFailure) {
          if (!isActive) {
            return;
          }

          setError(
            finishFailure instanceof Error
              ? finishFailure.message
              : "We signed you in, but couldn't attach your guest poster yet.",
          );
        }
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user;

      if (!isActive || !nextUser || isAnonymousUser(nextUser)) {
        return;
      }

      void resolveUser();
    });

    const interval = window.setInterval(() => {
      void resolveUser();
    }, 900);

    const timeout = window.setTimeout(() => {
      if (!isActive) {
        return;
      }

      setError("This sign-in took longer than expected. You can go to the dashboard or try again.");
    }, 8000);

    void resolveUser();

    return () => {
      isActive = false;
      subscription.unsubscribe();
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [nextPath]);

  return (
    <div className="playful-card rounded-[2rem] p-6 text-center sm:p-8">
      <p className="eyebrow">Finishing sign-in</p>
      <h1 className="panel-title mt-3 text-3xl font-semibold sm:text-4xl">Hold on while we open your Color Hunt.</h1>
      <p className="body-copy mt-3 text-base">
        We&apos;re attaching your Google session and taking you straight into the app.
      </p>
      <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-[rgba(88,58,134,0.1)] bg-white/70 px-4 py-3 text-sm text-[var(--muted)]">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--brand-coral)]" />
        Preparing your dashboard…
      </div>
      {error ? (
        <div className="mt-6 rounded-[1.5rem] border border-[rgba(53,37,30,0.1)] bg-white/65 p-4">
          <p className="body-copy text-sm sm:text-base">{error}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link className="button-primary w-full sm:w-auto" href={nextPath}>
              Open dashboard
            </Link>
            <Link className="button-secondary w-full sm:w-auto" href="/">
              Back to home
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
