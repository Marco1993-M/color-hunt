"use client";

import { useEffect, useState } from "react";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { createClient } from "@/lib/supabase/client";

type GuestSessionGateProps = {
  nextPath: string;
  entryMode: "hunt" | "cover";
};

let pendingGuestSession: Promise<void> | null = null;
function ensureGuestSession() {
  if (!pendingGuestSession) {
    pendingGuestSession = (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) return;
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
    })().finally(() => { pendingGuestSession = null; });
  }
  return pendingGuestSession;
}

export function GuestSessionGate({ nextPath, entryMode }: GuestSessionGateProps) {
  const [error, setError] = useState<string | null>(null);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function openGuestCanvas() {
      try {
        await ensureGuestSession();
        if (isActive) window.location.replace(nextPath);
      } catch {
        if (isActive) setError("We couldn't open your workspace. Check your connection, then try again.");
      }
    }

    void openGuestCanvas();
    return () => { isActive = false; };
  }, [nextPath, attempt]);

  return (
    <div className="mx-auto max-w-lg glass-panel rounded-[2rem] p-6 text-center sm:p-8">
      <p className="eyebrow">Opening your canvas</p>
      <h1 className="panel-title mt-3 text-3xl font-semibold">Your {entryMode === "cover" ? "cover" : "hunt"} is ready to make.</h1>
      <p className="body-copy mt-3 text-sm sm:text-base">We are setting up a private guest workspace so you can make the poster before deciding whether to create an account.</p>
      {error ? <div className="mt-5"><p className="text-sm text-[var(--brand-coral)]">{error}</p><button type="button" className="button-primary mt-4" onClick={() => { setError(null); setAttempt(value => value + 1); }}>Try again</button><div className="mt-4"><SocialAuthButtons mode="sign-in" nextPath={nextPath} source="guest_canvas_fallback" /></div></div> : <div className="mx-auto mt-6 h-2 w-24 overflow-hidden rounded-full bg-[rgba(47,97,223,0.12)]"><i className="block h-full w-1/2 rounded-full bg-[#2f61df]" /></div>}
    </div>
  );
}
