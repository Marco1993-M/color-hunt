"use client";

import { useEffect, useState } from "react";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { createClient } from "@/lib/supabase/client";

type GuestSessionGateProps = {
  nextPath: string;
  entryMode: "hunt" | "cover";
};

export function GuestSessionGate({ nextPath, entryMode }: GuestSessionGateProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function openGuestCanvas() {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInAnonymously();

      if (!isActive) return;

      if (authError) {
        setError(authError.message);
        return;
      }

      window.location.replace(nextPath);
    }

    void openGuestCanvas();
    return () => { isActive = false; };
  }, [nextPath]);

  return (
    <div className="mx-auto max-w-lg glass-panel rounded-[2rem] p-6 text-center sm:p-8">
      <p className="eyebrow">Opening your canvas</p>
      <h1 className="panel-title mt-3 text-3xl font-semibold">Your {entryMode === "cover" ? "cover" : "hunt"} is ready to make.</h1>
      <p className="body-copy mt-3 text-sm sm:text-base">We are setting up a private guest workspace so you can make the poster before deciding whether to create an account.</p>
      {error ? <div className="mt-5"><p className="text-sm text-[var(--brand-coral)]">{error}</p><div className="mt-4"><SocialAuthButtons mode="sign-in" nextPath={nextPath} source="guest_canvas_fallback" /></div></div> : <div className="mx-auto mt-6 h-2 w-24 overflow-hidden rounded-full bg-[rgba(47,97,223,0.12)]"><i className="block h-full w-1/2 rounded-full bg-[#2f61df]" /></div>}
    </div>
  );
}
