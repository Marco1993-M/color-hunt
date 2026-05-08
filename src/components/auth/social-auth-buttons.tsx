"use client";

import { useState, useTransition } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { trackEvent } from "@/lib/analytics";
import { getAppOrigin } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/client";
import { isAnonymousUser } from "@/lib/user-state";

type SocialAuthButtonsProps = {
  mode: "sign-in" | "upgrade";
  nextPath: string;
  source: string;
  tripId?: string;
  layout?: "stack" | "inline";
};

type ProviderName = "google";

export function SocialAuthButtons({
  mode,
  nextPath,
  source,
  tripId,
  layout = "stack",
}: SocialAuthButtonsProps) {
  const [error, setError] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<ProviderName | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleProvider(provider: ProviderName) {
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user: existingUser },
      } = await supabase.auth.getUser();

      if (existingUser && !isAnonymousUser(existingUser)) {
        trackEvent({
          eventName: "social_auth_already_signed_in",
          tripId,
          metadata: {
            source,
            mode,
            provider,
          },
        });
        window.location.assign(nextPath);
        return;
      }

      const appOrigin = getAppOrigin();

      if (!appOrigin) {
        setError("We couldn't determine the app URL for sign-in.");
        return;
      }

      setActiveProvider(provider);

      const callbackParams = new URLSearchParams({
        next: nextPath,
      });

      if (mode === "upgrade" && tripId) {
        callbackParams.set("transferTripId", tripId);
        if (existingUser?.id) {
          callbackParams.set("guestUserId", existingUser.id);
        }
      }

      const redirectTo = `${appOrigin}/auth/callback?${callbackParams.toString()}`;
      const credentials = {
        provider,
        options: {
          redirectTo,
        },
      } as const;

      const result = await supabase.auth.signInWithOAuth(credentials);

      if (result.error) {
        trackEvent({
          eventName: "social_auth_failed",
          tripId,
          metadata: {
            source,
            mode,
            provider,
            message: result.error.message,
          },
        });
        setActiveProvider(null);
        setError(result.error.message);
        return;
      }

      trackEvent({
        eventName: "social_auth_started",
        tripId,
        metadata: {
          source,
          mode,
          provider,
        },
      });
    });
  }

  return (
    <div className={`social-auth-buttons social-auth-buttons-${layout}`}>
      <button
        className="button-secondary w-full sm:w-auto"
        type="button"
        disabled={isPending}
        onClick={() => handleProvider("google")}
      >
        {isPending && activeProvider === "google"
          ? `${mode === "upgrade" ? "Connecting" : "Opening"} Google...`
          : "Continue with Google"}
      </button>

      {error ? <FeedbackToast kind="error" message={error} onDismiss={() => setError(null)} /> : null}
    </div>
  );
}
