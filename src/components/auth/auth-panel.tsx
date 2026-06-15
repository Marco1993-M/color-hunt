"use client";

import { useState, useTransition } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { trackEvent } from "@/lib/analytics";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { createClient } from "@/lib/supabase/client";

type AuthPanelProps = {
  nextPath?: string;
  challengeColorName?: string | null;
  requireSignIn?: boolean;
  entryMode?: "hunt" | "cover";
};

export function AuthPanel({
  nextPath = "/trips/new",
  challengeColorName = null,
  requireSignIn = false,
  entryMode = "hunt",
}: AuthPanelProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGuestStart() {
    setError(null);
    setMessage(null);

    trackEvent({
      eventName: "guest_start_clicked",
      metadata: {
        source: "landing_auth_panel",
        nextPath,
        challengeColorName,
        entryMode,
      },
    });

    startTransition(async () => {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInAnonymously();

      if (authError) {
        trackEvent({
          eventName: "guest_session_start_failed",
          metadata: {
            source: "landing_auth_panel",
            message: authError.message,
          },
        });
        setError(authError.message);
        return;
      }

      trackEvent({
        eventName: "guest_session_started",
        metadata: {
          source: "landing_auth_panel",
          nextPath,
          challengeColorName,
          entryMode,
        },
      });
      setMessage(entryMode === "cover" ? "Your guest cover flow is ready. Opening the builder..." : "Your guest hunt is ready. Opening the trip builder...");
      window.location.assign(nextPath);
    });
  }

  return (
    <div className="playful-card game-start-card rounded-[2rem] p-6 sm:p-8">
      <div className="game-start-kicker-row">
        <p className="eyebrow mb-0">
          {requireSignIn ? "Accept this challenge" : entryMode === "cover" ? "Start your first cover" : "Start your first hunt"}
        </p>
        <span className="game-start-badge">{requireSignIn ? "Google required" : "no signup wall"}</span>
      </div>
      <h2 className="panel-title balanced-text mt-4 text-2xl font-semibold sm:text-3xl">
        {requireSignIn ? "Sign in first, then take the challenge." : entryMode === "cover" ? "Start instantly as a guest." : "Start instantly as a guest."}
      </h2>
      <p className="body-copy mt-3 max-w-lg text-sm sm:text-base">
        {requireSignIn
          ? "Shared hunts work better when they start attached to a real account, so your challenge poster is ready to save and compare at the end."
          : entryMode === "cover"
            ? "Pick a cover template, drop in four photos, and make something social-ready before any account friction shows up."
            : "Pick a place, get a color mission, and start collecting the little details most people miss before any account friction shows up."}
      </p>
      <p className="game-start-note mt-3">
        {challengeColorName
          ? requireSignIn
            ? `Continue with Google to take on this ${challengeColorName} challenge.`
            : `Save with Google later if you want to keep this ${challengeColorName} challenge.`
          : requireSignIn
            ? "Continue with Google to begin."
            : entryMode === "cover"
              ? "Save with Google later once your cover is worth keeping."
              : "Save with Google later once your poster is worth keeping."}
      </p>
      <div className="game-start-points mt-5">
        {requireSignIn ? <span>Continue with Google</span> : null}
        {entryMode === "cover" ? (
          <>
            <span>Pick a template</span>
            <span>Add four photos</span>
            <span>Make the cover</span>
          </>
        ) : (
          <>
            <span>Pick a place</span>
            <span>Get a color</span>
            <span>Make the poster</span>
          </>
        )}
      </div>

      <div className="mt-6 space-y-4">
        {!requireSignIn ? (
          <>
            <button className="button-primary w-full sm:w-auto" type="button" disabled={isPending} onClick={handleGuestStart}>
              {isPending ? "Opening your hunt..." : "Start as guest"}
            </button>

            <div className="guest-auth-divider">
              <span>Already saved a hunt?</span>
            </div>
          </>
        ) : null}

        <SocialAuthButtons mode="sign-in" nextPath={nextPath} source="landing_auth_panel" />
      </div>

      {message ? <FeedbackToast kind="success" message={message} onDismiss={() => setMessage(null)} /> : null}
      {error ? <FeedbackToast kind="error" message={error} onDismiss={() => setError(null)} /> : null}
    </div>
  );
}
