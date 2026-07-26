"use client";

import { useEffect, useState } from "react";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { createClient } from "@/lib/supabase/client";
import { isAnonymousUser } from "@/lib/user-state";

type SocialUpgradePanelProps = {
  tripId: string;
  nextPath: string;
};

export function SocialUpgradePanel({ tripId, nextPath }: SocialUpgradePanelProps) {
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isActive = true;
    const supabase = createClient();

    async function resolveSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isActive) {
        return;
      }

      if (user && !isAnonymousUser(user)) {
        window.location.assign(nextPath);
        return;
      }

      setIsCheckingSession(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user;

      if (!isActive || !nextUser) {
        return;
      }

      if (!isAnonymousUser(nextUser)) {
        window.location.assign(nextPath);
      }
    });

    const interval = window.setInterval(() => {
      void resolveSession();
    }, 1200);

    void resolveSession();

    return () => {
      isActive = false;
      window.clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [nextPath]);

  if (isCheckingSession) {
    return (
      <div className="glass-panel rounded-[1.8rem] p-5 sm:p-6">
        <p className="eyebrow">Checking sign-in</p>
        <p className="body-copy mt-2 text-sm sm:text-base">Hold on while we confirm your account state and finish the Google handoff.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-[1.8rem] p-5 sm:p-6">
      <div className="space-y-3">
        <p className="eyebrow">Save this poster</p>
        <h3 className="panel-title text-2xl font-semibold">Keep this edit and make the next one faster.</h3>
        <p className="body-copy max-w-2xl text-sm sm:text-base">
          Your download is yours either way. Connect Google to keep this editable, return to it later, and build a personal library of posters.
        </p>
      </div>

      <div className="mt-5">
        <SocialAuthButtons mode="upgrade" nextPath={nextPath} source="poster_upgrade_panel" tripId={tripId} />
      </div>

      <div className="game-start-points mt-5">
        <span>Keep this edit</span>
        <span>Return anytime</span>
        <span>Make more posters</span>
      </div>
    </div>
  );
}
