"use client";

import { useState, useTransition } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { trackEvent } from "@/lib/analytics";
import { getAppOrigin } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/client";

export function AuthPanel() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRequestOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const supabase = createClient();
      const appOrigin = getAppOrigin();

      if (!appOrigin) {
        setError("We couldn't determine the app URL for sign-in.");
        return;
      }

      const redirectTo = `${appOrigin}/auth/callback?next=/dashboard`;
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (authError) {
        trackEvent({
          eventName: "email_otp_request_failed",
          metadata: {
            source: "landing_auth_panel",
            message: authError.message,
          },
        });
        setError(authError.message);
        return;
      }

      trackEvent({
        eventName: "email_otp_requested",
        metadata: {
          source: "landing_auth_panel",
        },
      });
      setStep("verify");
      setOtp("");
      setMessage("Check your email for the 6-digit code.");
    });
  }

  function handleVerifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (verifyError) {
        trackEvent({
          eventName: "email_otp_verify_failed",
          metadata: {
            source: "landing_auth_panel",
            message: verifyError.message,
          },
        });
        setError(verifyError.message);
        return;
      }

      trackEvent({
        eventName: "email_otp_verified",
        metadata: {
          source: "landing_auth_panel",
        },
      });
      setMessage("You're in. Opening your dashboard...");
      setEmail("");
      setOtp("");
      window.location.assign("/dashboard");
    });
  }

  return (
    <div className="playful-card game-start-card rounded-[2rem] p-6 sm:p-8">
      <div className="game-start-kicker-row">
        <p className="eyebrow mb-0">Start your first hunt</p>
        <span className="game-start-badge">takes 10 seconds</span>
      </div>
      <h2 className="panel-title balanced-text mt-4 text-2xl font-semibold sm:text-3xl">
        Pop in your email and we&apos;ll send a one-time code.
      </h2>
      <p className="body-copy mt-3 max-w-lg text-sm sm:text-base">
        Pick a place, get a color mission, and start collecting the little details most people miss.
      </p>
      <p className="game-start-note mt-3">No password spiral. No download. Just straight into the hunt.</p>
      <div className="game-start-points mt-5">
        <span>Pick a place</span>
        <span>Get a color</span>
        <span>Make the poster</span>
      </div>

      {step === "request" ? (
        <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={handleRequestOtp}>
          <input
            aria-label="Email address"
            className="field-input flex-1"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <button className="button-primary" type="submit" disabled={isPending}>
            {isPending ? "Sending..." : "Send my code"}
          </button>
        </form>
      ) : (
        <form className="mt-6 space-y-3" onSubmit={handleVerifyOtp}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              aria-label="6-digit code"
              className="field-input flex-1"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
            <button className="button-primary" type="submit" disabled={isPending || otp.length < 6}>
              {isPending ? "Checking..." : "Verify code"}
            </button>
          </div>
          <div className="flex flex-col gap-2 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
            <p>Code sent to {email}.</p>
            <div className="flex gap-3">
              <button
                className="font-semibold text-[var(--muted-strong)]"
                type="button"
                onClick={() => {
                  setStep("request");
                  setOtp("");
                  setMessage(null);
                  setError(null);
                }}
              >
                Change email
              </button>
              <button
                className="font-semibold text-[var(--muted-strong)]"
                type="button"
                onClick={() => {
                  setStep("request");
                  setMessage("Ready to send a fresh code.");
                  setError(null);
                }}
              >
                Resend code
              </button>
            </div>
          </div>
        </form>
      )}

      {message ? <FeedbackToast kind="success" message={message} onDismiss={() => setMessage(null)} /> : null}
      {error ? <FeedbackToast kind="error" message={error} onDismiss={() => setError(null)} /> : null}
    </div>
  );
}
