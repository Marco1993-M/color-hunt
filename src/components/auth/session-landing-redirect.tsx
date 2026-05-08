"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isAnonymousUser } from "@/lib/user-state";

type SessionLandingRedirectProps = {
  enabled: boolean;
};

export function SessionLandingRedirect({ enabled }: SessionLandingRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isActive = true;
    const supabase = createClient();

    async function resolveUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isActive || !user || isAnonymousUser(user)) {
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    }

    void resolveUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user;

      if (!isActive || !nextUser || isAnonymousUser(nextUser)) {
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [enabled, router]);

  return null;
}
