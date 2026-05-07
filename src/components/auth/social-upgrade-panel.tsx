"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { createClient } from "@/lib/supabase/client";
import { isAnonymousUser } from "@/lib/user-state";

type SocialUpgradePanelProps = {
  tripId: string;
  nextPath: string;
};

export function SocialUpgradePanel({ tripId, nextPath }: SocialUpgradePanelProps) {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isActive = true;

    async function checkSession() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isActive) {
        return;
      }

      if (user && !isAnonymousUser(user)) {
        router.refresh();
        return;
      }

      setIsCheckingSession(false);
    }

    void checkSession();

    return () => {
      isActive = false;
    };
  }, [router]);

  if (isCheckingSession) {
    return (
      <div className="glass-panel rounded-[1.8rem] p-5 sm:p-6">
        <p className="eyebrow">Checking sign-in</p>
        <p className="body-copy mt-2 text-sm sm:text-base">Hold on while we confirm your account state.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-[1.8rem] p-5 sm:p-6">
      <div className="space-y-3">
        <p className="eyebrow">Save this poster</p>
        <h3 className="panel-title text-2xl font-semibold">Your Color Hunt is ready. Keep it with Google or Apple.</h3>
        <p className="body-copy max-w-2xl text-sm sm:text-base">
          You can hunt as a guest, but publishing, downloading, and coming back later need a real account attached to this poster.
        </p>
      </div>

      <div className="mt-5">
        <SocialAuthButtons mode="upgrade" nextPath={nextPath} source="poster_upgrade_panel" tripId={tripId} />
      </div>

      <div className="game-start-points mt-5">
        <span>Keep this trip</span>
        <span>Publish the poster</span>
        <span>Come back later</span>
      </div>
    </div>
  );
}
