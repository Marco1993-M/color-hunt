import Link from "next/link";
import { createCoverAction } from "@/app/actions";
import { EventOnView } from "@/components/analytics/event-on-view";
import { AuthPanel } from "@/components/auth/auth-panel";
import { NewCoverBuilder } from "@/components/covers/new-cover-builder";
import { SessionLandingRedirect } from "@/components/auth/session-landing-redirect";
import { createClient } from "@/lib/supabase/server";
import { isAnonymousUser } from "@/lib/user-state";

export default async function NewCoverPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isGuest = isAnonymousUser(user);

  return (
    <main className="app-shell page-frame">
      <SessionLandingRedirect enabled={false} />
      <EventOnView eventName="cover_builder_viewed" metadata={{ isAuthenticated: Boolean(user), isAnonymous: isGuest }} />
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link href="/" className="text-sm text-[var(--muted)]">
            ← Back to landing page
          </Link>
        </div>

        <div className="playful-card rounded-[2.5rem] p-6 sm:p-8">
          <p className="eyebrow">Cover maker</p>
          <h1 className="panel-title mt-3 text-3xl font-semibold sm:text-4xl">Turn four photos into a cover.</h1>
          <p className="body-copy mt-3 max-w-2xl text-base">
            This is the faster second lane. Pick a template, drop in four photos, and make a social-ready cover without starting from a color hunt.
          </p>

          {user ? (
            <NewCoverBuilder createAction={createCoverAction} />
          ) : (
            <div className="mt-8">
              <AuthPanel nextPath="/covers/new" entryMode="cover" />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
