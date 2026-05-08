"use client";

import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";

type AuthPanelProps = {
  nextPath?: string;
  challengeColorName?: string | null;
};

export function AuthPanel({ nextPath = "/trips/new", challengeColorName = null }: AuthPanelProps) {
  return (
    <div className="playful-card game-start-card rounded-[2rem] p-6 sm:p-8">
      <div className="game-start-kicker-row">
        <p className="eyebrow mb-0">Start your first hunt</p>
        <span className="game-start-badge">one-tap Google</span>
      </div>
      <h2 className="panel-title balanced-text mt-4 text-2xl font-semibold sm:text-3xl">
        Sign in once, then hunt without friction.
      </h2>
      <p className="body-copy mt-3 max-w-lg text-sm sm:text-base">
        Start with Google so every photo, poster, and share link is already attached to your account from the first tap.
      </p>
      <p className="game-start-note mt-3">
        {challengeColorName
          ? `Sign in and jump straight into this ${challengeColorName} challenge.`
          : "Sign in first so your poster is ready to save and share when you finish."}
      </p>
      <div className="game-start-points mt-5">
        <span>Continue with Google</span>
        <span>Pick a place</span>
        <span>Get a color</span>
        <span>Make the poster</span>
      </div>

      <div className="mt-6">
        <SocialAuthButtons mode="sign-in" nextPath={nextPath} source="landing_auth_panel" />
      </div>
    </div>
  );
}
