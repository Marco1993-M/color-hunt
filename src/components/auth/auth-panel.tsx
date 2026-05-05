"use client";

import { useState, useTransition } from "react";
import { FeedbackToast } from "@/components/ui/feedback-toast";
import { trackEvent } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/client";

export function AuthPanel() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (authError) {
        trackEvent({
          eventName: "magic_link_request_failed",
          metadata: {
            source: "landing_auth_panel",
            message: authError.message,
          },
        });
        setError(authError.message);
        return;
      }

      trackEvent({
        eventName: "magic_link_requested",
        metadata: {
          source: "landing_auth_panel",
        },
      });
      setMessage("Check your email for the sign-in link.");
      setEmail("");
    });
  }

  return (
    <div className="playful-card game-start-card rounded-[2rem] p-6 sm:p-8">
      <div className="game-start-kicker-row">
        <p className="eyebrow mb-0">Start your first hunt</p>
        <span className="game-start-badge">takes 10 seconds</span>
      </div>
      <h2 className="panel-title balanced-text mt-4 text-2xl font-semibold sm:text-3xl">
        Pop in your email and we&apos;ll deal you a magic link.
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
      <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
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
          {isPending ? "Sending..." : "Start the hunt"}
        </button>
      </form>
      {message ? <FeedbackToast kind="success" message={message} onDismiss={() => setMessage(null)} /> : null}
      {error ? <FeedbackToast kind="error" message={error} onDismiss={() => setError(null)} /> : null}
    </div>
  );
}
